/*
 * OpenMP shared-memory worker for application log analysis.
 * Splits a file into N byte ranges and processes them with #pragma omp parallel for.
 * Emits one JSON PartialResult object (compatible with Python merge_partials keys).
 */

#define _GNU_SOURCE
#include <ctype.h>
#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef _SSIZE_T_DEFINED
#ifdef _WIN32
typedef long ssize_t;
#endif
#endif

#define MAX_ENTRIES 2048
#define KEY_LEN 128
#define MSG_LEN 256
#define JSON_CAP (4 * 1024 * 1024)

typedef struct {
  char key[KEY_LEN];
  int count;
} FlatEntry;

typedef struct {
  char outer[KEY_LEN];
  char inner[KEY_LEN];
  int count;
} NestedEntry;

typedef struct {
  long records_processed;
  long valid_records;
  long invalid_records;
  long count_5xx;
  FlatEntry level_counts[MAX_ENTRIES];
  int n_level;
  FlatEntry status_counts[MAX_ENTRIES];
  int n_status;
  FlatEntry error_patterns[MAX_ENTRIES];
  int n_error;
  FlatEntry service_counts[MAX_ENTRIES];
  int n_service;
  FlatEntry path_counts[MAX_ENTRIES];
  int n_path;
  FlatEntry ip_counts[MAX_ENTRIES];
  int n_ip;
  FlatEntry auth_fail_by_ip[MAX_ENTRIES];
  int n_auth;
  FlatEntry not_found_by_ip[MAX_ENTRIES];
  int n_nf;
  FlatEntry sensitive_path_counts[MAX_ENTRIES];
  int n_sens;
  NestedEntry paths_by_ip[MAX_ENTRIES];
  int n_paths_by_ip;
  NestedEntry auth_fail_by_ip_minute[MAX_ENTRIES];
  int n_auth_min;
} Partial;

static void flat_inc(FlatEntry *arr, int *n, const char *key) {
  if (!key || !*key) return;
  for (int i = 0; i < *n; i++) {
    if (strcmp(arr[i].key, key) == 0) {
      arr[i].count++;
      return;
    }
  }
  if (*n >= MAX_ENTRIES) return;
  strncpy(arr[*n].key, key, KEY_LEN - 1);
  arr[*n].key[KEY_LEN - 1] = '\0';
  arr[*n].count = 1;
  (*n)++;
}

static void nested_inc(NestedEntry *arr, int *n, const char *outer, const char *inner) {
  if (!outer || !inner || !*outer || !*inner) return;
  for (int i = 0; i < *n; i++) {
    if (strcmp(arr[i].outer, outer) == 0 && strcmp(arr[i].inner, inner) == 0) {
      arr[i].count++;
      return;
    }
  }
  if (*n >= MAX_ENTRIES) return;
  strncpy(arr[*n].outer, outer, KEY_LEN - 1);
  arr[*n].outer[KEY_LEN - 1] = '\0';
  strncpy(arr[*n].inner, inner, KEY_LEN - 1);
  arr[*n].inner[KEY_LEN - 1] = '\0';
  arr[*n].count = 1;
  (*n)++;
}

static void merge_flat(FlatEntry *dst, int *nd, FlatEntry *src, int ns) {
  for (int i = 0; i < ns; i++) {
    int found = 0;
    for (int j = 0; j < *nd; j++) {
      if (strcmp(dst[j].key, src[i].key) == 0) {
        dst[j].count += src[i].count;
        found = 1;
        break;
      }
    }
    if (!found && *nd < MAX_ENTRIES) {
      dst[*nd] = src[i];
      (*nd)++;
    }
  }
}

static void merge_nested(NestedEntry *dst, int *nd, NestedEntry *src, int ns) {
  for (int i = 0; i < ns; i++) {
    int found = 0;
    for (int j = 0; j < *nd; j++) {
      if (strcmp(dst[j].outer, src[i].outer) == 0 &&
          strcmp(dst[j].inner, src[i].inner) == 0) {
        dst[j].count += src[i].count;
        found = 1;
        break;
      }
    }
    if (!found && *nd < MAX_ENTRIES) {
      dst[*nd] = src[i];
      (*nd)++;
    }
  }
}

static void merge_partial(Partial *dst, const Partial *src) {
  dst->records_processed += src->records_processed;
  dst->valid_records += src->valid_records;
  dst->invalid_records += src->invalid_records;
  dst->count_5xx += src->count_5xx;
  merge_flat(dst->level_counts, &dst->n_level, (FlatEntry *)src->level_counts, src->n_level);
  merge_flat(dst->status_counts, &dst->n_status, (FlatEntry *)src->status_counts, src->n_status);
  merge_flat(dst->error_patterns, &dst->n_error, (FlatEntry *)src->error_patterns, src->n_error);
  merge_flat(dst->service_counts, &dst->n_service, (FlatEntry *)src->service_counts, src->n_service);
  merge_flat(dst->path_counts, &dst->n_path, (FlatEntry *)src->path_counts, src->n_path);
  merge_flat(dst->ip_counts, &dst->n_ip, (FlatEntry *)src->ip_counts, src->n_ip);
  merge_flat(dst->auth_fail_by_ip, &dst->n_auth, (FlatEntry *)src->auth_fail_by_ip, src->n_auth);
  merge_flat(dst->not_found_by_ip, &dst->n_nf, (FlatEntry *)src->not_found_by_ip, src->n_nf);
  merge_flat(dst->sensitive_path_counts, &dst->n_sens, (FlatEntry *)src->sensitive_path_counts,
             src->n_sens);
  merge_nested(dst->paths_by_ip, &dst->n_paths_by_ip, (NestedEntry *)src->paths_by_ip,
               src->n_paths_by_ip);
  merge_nested(dst->auth_fail_by_ip_minute, &dst->n_auth_min,
               (NestedEntry *)src->auth_fail_by_ip_minute, src->n_auth_min);
}

static int starts_with(const char *s, const char *prefix) {
  size_t n = strlen(prefix);
  return strncmp(s, prefix, n) == 0;
}

static int str_contains_ci(const char *hay, const char *needle) {
  if (!hay || !needle) return 0;
  size_t nlen = strlen(needle);
  if (!nlen) return 1;
  for (const char *p = hay; *p; p++) {
    size_t i = 0;
    while (i < nlen && p[i] &&
           tolower((unsigned char)p[i]) == tolower((unsigned char)needle[i])) {
      i++;
    }
    if (i == nlen) return 1;
  }
  return 0;
}

/* Portable getline substitute (POSIX getline is missing on some MinGW builds). */
static ssize_t read_line(char **lineptr, size_t *n, FILE *stream) {
  if (!lineptr || !n || !stream) return -1;
  if (*lineptr == NULL || *n == 0) {
    *n = 1024;
    *lineptr = (char *)malloc(*n);
    if (!*lineptr) return -1;
  }
  size_t len = 0;
  int ch;
  while ((ch = fgetc(stream)) != EOF) {
    if (len + 1 >= *n) {
      size_t nn = *n * 2;
      char *p = (char *)realloc(*lineptr, nn);
      if (!p) return -1;
      *lineptr = p;
      *n = nn;
    }
    (*lineptr)[len++] = (char)ch;
    if (ch == '\n') break;
  }
  if (len == 0 && ch == EOF) return -1;
  (*lineptr)[len] = '\0';
  return (ssize_t)len;
}

static const char *classify_error(const char *msg) {
  char lower[MSG_LEN];
  size_t i;
  for (i = 0; i < MSG_LEN - 1 && msg[i]; i++) lower[i] = (char)tolower((unsigned char)msg[i]);
  lower[i] = '\0';
  if (strstr(lower, "database connection timeout")) return "database_timeout";
  if (strstr(lower, "failed password")) return "authentication_failure";
  if (strstr(lower, "sql syntax")) return "sql_syntax";
  if (strstr(lower, "upstream 502")) return "upstream_502";
  if (strstr(lower, "payment gateway unreachable")) return "gateway_unreachable";
  if (strstr(lower, "crash loop")) return "crash_loop";
  return "other_error";
}

static const char *sensitive_key(const char *path) {
  if (!path) return NULL;
  char lower[KEY_LEN];
  size_t i;
  for (i = 0; i < KEY_LEN - 1 && path[i]; i++) lower[i] = (char)tolower((unsigned char)path[i]);
  lower[i] = '\0';
  const char *prefixes[] = {"/admin", "/.env", "/config", NULL};
  for (int p = 0; prefixes[p]; p++) {
    size_t n = strlen(prefixes[p]);
    if (strcmp(lower, prefixes[p]) == 0) return prefixes[p];
    if (starts_with(lower, prefixes[p]) &&
        (lower[n] == '/' || lower[n] == '?' || lower[n] == '\0'))
      return prefixes[p];
  }
  return NULL;
}

static void minute_bucket(const char *ts, char *out, size_t out_len) {
  size_t n = strlen(ts);
  if (n >= 16) n = 16;
  if (n >= out_len) n = out_len - 1;
  memcpy(out, ts, n);
  out[n] = '\0';
}

/* Parse application log line matching Python ApplicationParser field set. */
static int parse_and_apply(Partial *p, const char *line) {
  while (*line == ' ' || *line == '\t') line++;
  if (!*line) return 0;

  char ts[64] = {0};
  char level[16] = {0};
  char service[64] = {0};
  char rest[1024] = {0};
  if (sscanf(line, "%63s %15s %63s %1023[^\n]", ts, level, service, rest) < 3) {
    p->records_processed++;
    p->invalid_records++;
    return 1;
  }
  for (char *c = level; *c; c++) *c = (char)toupper((unsigned char)*c);
  if (strcmp(level, "WARN") == 0) strcpy(level, "WARNING");
  if (strcmp(level, "INFO") && strcmp(level, "WARNING") && strcmp(level, "ERROR") &&
      strcmp(level, "CRITICAL") && strcmp(level, "DEBUG")) {
    p->records_processed++;
    p->invalid_records++;
    return 1;
  }

  char ip[64] = {0};
  char method[16] = {0};
  char path[128] = {0};
  int status = -1;
  long latency = -1;
  char message[MSG_LEN] = {0};

  /* Split optional trailing fields from message */
  char *cursor = rest;
  char *ip_p = strstr(cursor, " ip=");
  char *meth_p = NULL;
  const char *methods[] = {" GET ", " POST ", " PUT ", " PATCH ", " DELETE ", NULL};
  for (int m = 0; methods[m]; m++) {
    char *hit = strstr(cursor, methods[m]);
    if (hit && (!meth_p || hit < meth_p)) meth_p = hit;
  }
  char *status_p = strstr(cursor, " status=");
  char *lat_p = strstr(cursor, " latency_ms=");

  char *msg_end = cursor + strlen(cursor);
  if (ip_p && ip_p < msg_end) msg_end = ip_p;
  if (meth_p && meth_p < msg_end) msg_end = meth_p;
  if (status_p && status_p < msg_end) msg_end = status_p;
  if (lat_p && lat_p < msg_end) msg_end = lat_p;

  size_t msg_len = (size_t)(msg_end - cursor);
  if (msg_len >= MSG_LEN) msg_len = MSG_LEN - 1;
  memcpy(message, cursor, msg_len);
  message[msg_len] = '\0';
  /* trim */
  while (msg_len > 0 && (message[msg_len - 1] == ' ' || message[msg_len - 1] == '\t')) {
    message[--msg_len] = '\0';
  }

  if (ip_p) sscanf(ip_p, " ip=%63s", ip);
  if (meth_p) {
    sscanf(meth_p, " %15s %127s", method, path);
  }
  if (status_p) sscanf(status_p, " status=%d", &status);
  if (lat_p) sscanf(lat_p, " latency_ms=%ld", &latency);
  (void)latency;

  p->records_processed++;
  p->valid_records++;
  flat_inc(p->level_counts, &p->n_level, level);
  flat_inc(p->service_counts, &p->n_service, service);
  if (status >= 0) {
    char st[8];
    snprintf(st, sizeof(st), "%d", status);
    flat_inc(p->status_counts, &p->n_status, st);
    if (status >= 500) p->count_5xx++;
  }
  if (strcmp(level, "ERROR") == 0 || strcmp(level, "CRITICAL") == 0) {
    flat_inc(p->error_patterns, &p->n_error, classify_error(message));
  }
  if (path[0]) flat_inc(p->path_counts, &p->n_path, path);
  if (ip[0]) {
    flat_inc(p->ip_counts, &p->n_ip, ip);
    if (path[0]) nested_inc(p->paths_by_ip, &p->n_paths_by_ip, ip, path);
    if (status == 404) flat_inc(p->not_found_by_ip, &p->n_nf, ip);
    int auth = (status == 401) || str_contains_ci(message, "failed password");
    if (auth) {
      flat_inc(p->auth_fail_by_ip, &p->n_auth, ip);
      char minute[32];
      minute_bucket(ts, minute, sizeof(minute));
      nested_inc(p->auth_fail_by_ip_minute, &p->n_auth_min, ip, minute);
    }
  }
  const char *sens = sensitive_key(path[0] ? path : NULL);
  if (sens) flat_inc(p->sensitive_path_counts, &p->n_sens, sens);
  return 1;
}

static void process_range(Partial *out, const char *path, long start, long end) {
  /* Match Python iter_aligned_lines: peek-back align, finish line past end. */
  memset(out, 0, sizeof(*out));
  FILE *fp = fopen(path, "rb");
  if (!fp) return;
  if (start <= 0) {
    fseek(fp, 0, SEEK_SET);
  } else {
    if (fseek(fp, start - 1, SEEK_SET) != 0) {
      fclose(fp);
      return;
    }
    int prev = fgetc(fp);
    if (prev != '\n' && prev != '\r') {
      char *discard = NULL;
      size_t dcap = 0;
      read_line(&discard, &dcap, fp);
      free(discard);
    }
  }

  char *line = NULL;
  size_t cap = 0;
  while (1) {
    long pos = ftell(fp);
    if (pos < 0 || pos >= end) break;
    ssize_t n = read_line(&line, &cap, fp);
    if (n < 0) break;
    if (n > 0 && line[n - 1] == '\n') line[n - 1] = '\0';
    {
      size_t L = strlen(line);
      if (L > 0 && line[L - 1] == '\r') line[L - 1] = '\0';
    }
    parse_and_apply(out, line);
  }
  free(line);
  fclose(fp);
}

static int json_escape(const char *in, char *out, size_t out_len) {
  size_t j = 0;
  for (size_t i = 0; in[i] && j + 2 < out_len; i++) {
    char c = in[i];
    if (c == '"' || c == '\\') {
      out[j++] = '\\';
      out[j++] = c;
    } else if ((unsigned char)c < 0x20) {
      /* skip control */
    } else {
      out[j++] = c;
    }
  }
  out[j] = '\0';
  return (int)j;
}

static int append_flat_obj(char *buf, size_t cap, int used, const char *name, FlatEntry *arr,
                           int n) {
  used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "\"%s\":{", name);
  for (int i = 0; i < n; i++) {
    char esc[KEY_LEN * 2];
    json_escape(arr[i].key, esc, sizeof(esc));
    used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "%s\"%s\":%d",
                     i ? "," : "", esc, arr[i].count);
  }
  used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "},");
  return used;
}

static int append_nested_obj(char *buf, size_t cap, int used, const char *name, NestedEntry *arr,
                             int n) {
  /* Build nested JSON object: { outer: { inner: count } } */
  used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "\"%s\":{", name);
  /* Collect unique outers in order */
  char outers[MAX_ENTRIES][KEY_LEN];
  int n_outers = 0;
  for (int i = 0; i < n; i++) {
    int found = 0;
    for (int j = 0; j < n_outers; j++) {
      if (strcmp(outers[j], arr[i].outer) == 0) {
        found = 1;
        break;
      }
    }
    if (!found && n_outers < MAX_ENTRIES) {
      strncpy(outers[n_outers], arr[i].outer, KEY_LEN - 1);
      outers[n_outers][KEY_LEN - 1] = '\0';
      n_outers++;
    }
  }
  for (int o = 0; o < n_outers; o++) {
    char esc_o[KEY_LEN * 2];
    json_escape(outers[o], esc_o, sizeof(esc_o));
    used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "%s\"%s\":{",
                     o ? "," : "", esc_o);
    int first = 1;
    for (int i = 0; i < n; i++) {
      if (strcmp(arr[i].outer, outers[o]) != 0) continue;
      char esc_i[KEY_LEN * 2];
      json_escape(arr[i].inner, esc_i, sizeof(esc_i));
      used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "%s\"%s\":%d",
                       first ? "" : ",", esc_i, arr[i].count);
      first = 0;
    }
    used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "}");
  }
  used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "},");
  return used;
}

static int partial_to_json(const Partial *p, char *buf, size_t cap) {
  int used = 0;
  used += snprintf(buf + used, cap, "{");
  used += snprintf(buf + used, cap - (size_t)used,
                   "\"worker_id\":-1,\"records_processed\":%ld,\"valid_records\":%ld,"
                   "\"invalid_records\":%ld,\"count_5xx\":%ld,",
                   p->records_processed, p->valid_records, p->invalid_records, p->count_5xx);
  used = append_flat_obj(buf, cap, used, "level_counts", (FlatEntry *)p->level_counts, p->n_level);
  used =
      append_flat_obj(buf, cap, used, "status_counts", (FlatEntry *)p->status_counts, p->n_status);
  used =
      append_flat_obj(buf, cap, used, "error_patterns", (FlatEntry *)p->error_patterns, p->n_error);
  used = append_flat_obj(buf, cap, used, "service_counts", (FlatEntry *)p->service_counts,
                         p->n_service);
  used = append_flat_obj(buf, cap, used, "path_counts", (FlatEntry *)p->path_counts, p->n_path);
  used = append_flat_obj(buf, cap, used, "ip_counts", (FlatEntry *)p->ip_counts, p->n_ip);
  used =
      append_flat_obj(buf, cap, used, "auth_fail_by_ip", (FlatEntry *)p->auth_fail_by_ip, p->n_auth);
  used =
      append_flat_obj(buf, cap, used, "not_found_by_ip", (FlatEntry *)p->not_found_by_ip, p->n_nf);
  used = append_flat_obj(buf, cap, used, "sensitive_path_counts",
                         (FlatEntry *)p->sensitive_path_counts, p->n_sens);
  used = append_nested_obj(buf, cap, used, "paths_by_ip", (NestedEntry *)p->paths_by_ip,
                           p->n_paths_by_ip);
  used = append_nested_obj(buf, cap, used, "auth_fail_by_ip_minute",
                           (NestedEntry *)p->auth_fail_by_ip_minute, p->n_auth_min);
  if (used > 0 && buf[used - 1] == ',') used--;
  used += snprintf(buf + used, cap > (size_t)used ? cap - (size_t)used : 0, "}");
  return used;
}

/* Exported API ----------------------------------------------------------- */

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

EXPORT int openmp_analyze_file(const char *path, int nthreads, char *out_json, int out_cap) {
  if (!path || !out_json || out_cap < 16) return -1;
  FILE *fp = fopen(path, "rb");
  if (!fp) return -2;
  if (fseek(fp, 0, SEEK_END) != 0) {
    fclose(fp);
    return -2;
  }
  long total = ftell(fp);
  fclose(fp);
  if (total < 0) return -2;

  int n = nthreads < 1 ? 1 : nthreads;
  if (total == 0) n = 1;
  if (total > 0 && n > total) n = (int)total;

  long *starts = (long *)calloc((size_t)n, sizeof(long));
  long *ends = (long *)calloc((size_t)n, sizeof(long));
  Partial *locals = (Partial *)calloc((size_t)n, sizeof(Partial));
  Partial *merged = (Partial *)calloc(1, sizeof(Partial));
  if (!starts || !ends || !locals || !merged) {
    free(starts);
    free(ends);
    free(locals);
    free(merged);
    return -3;
  }

  long size = total / n;
  for (int i = 0; i < n; i++) {
    starts[i] = i * size;
    ends[i] = (i == n - 1) ? total : (i + 1) * size;
  }

  omp_set_num_threads(n);
#pragma omp parallel for schedule(static)
  for (int i = 0; i < n; i++) {
    process_range(&locals[i], path, starts[i], ends[i]);
  }

  for (int i = 0; i < n; i++) merge_partial(merged, &locals[i]);

  int written = partial_to_json(merged, out_json, (size_t)out_cap);
  free(starts);
  free(ends);
  free(locals);
  free(merged);
  if (written <= 0 || written >= out_cap) return -4;
  return written;
}

EXPORT const char *openmp_worker_version(void) { return "openmp-worker-1.0"; }
