# OpenMP worker shared library
# Linux/WSL: make
# Windows (WinLibs/MinGW): make dll

CC ?= gcc
CFLAGS ?= -O2 -Wall -Wextra -fopenmp
SRC = openmp_worker.c

.PHONY: all clean dll so

all: so

so: libopenmp_worker.so

libopenmp_worker.so: $(SRC)
	$(CC) $(CFLAGS) -fPIC -shared -o $@ $(SRC) -fopenmp

dll: libopenmp_worker.dll

libopenmp_worker.dll: $(SRC)
	$(CC) $(CFLAGS) -shared -o $@ $(SRC) -fopenmp

clean:
	rm -f libopenmp_worker.so libopenmp_worker.dll
