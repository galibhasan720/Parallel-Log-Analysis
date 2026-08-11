/* Optional smoke test linked against libopenmp_worker.so */
#include <stdio.h>
#include <stdlib.h>

int openmp_analyze_file(const char *path, int nthreads, char *out_json, int out_cap);
const char *openmp_worker_version(void);

int main(int argc, char **argv) {
  const char *path = argc > 1 ? argv[1] : NULL;
  if (!path) {
    printf("%s\n", openmp_worker_version());
    return 0;
  }
  char *buf = (char *)malloc(4 * 1024 * 1024);
  if (!buf) return 2;
  int n = openmp_analyze_file(path, 2, buf, 4 * 1024 * 1024);
  if (n < 0) {
    fprintf(stderr, "openmp_analyze_file failed: %d\n", n);
    free(buf);
    return 1;
  }
  fwrite(buf, 1, (size_t)n, stdout);
  fputc('\n', stdout);
  free(buf);
  return 0;
}
