"""Single-node MPI analysis via mpi4py (distributed-memory programming model).

Run under mpirun so COMM_WORLD size matches intended parallelism:
  mpirun -np 4 python -m hpc_engine.analyze --backend mpi --input FILE --workers 4
"""

from __future__ import annotations

from app.hpc.aggregation.reducer import merge_partials
from app.hpc.input_source import FileInputSource
from app.hpc.parsers.registry import default_registry
from app.hpc.partial import PartialResult, empty_partial
from app.hpc.scheduling.static_scheduler import build_chunk_specs
from app.hpc.workers.process_worker import process_chunk


def analyze_file_mpi(
    path: str,
    *,
    workers: int | None = None,
    parser_name: str | None = None,
) -> PartialResult | None:
    """Analyze ``path`` with one static chunk plan shared across MPI ranks.

    Returns the merged partial on rank 0; other ranks return ``None``.
    """
    try:
        from mpi4py import MPI
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "mpi4py is required for --backend mpi. "
            "Install OpenMPI + mpi4py in WSL (see docs/SETUP.md)."
        ) from exc

    comm = MPI.COMM_WORLD
    rank = int(comm.Get_rank())
    size = max(1, int(comm.Get_size()))

    source = FileInputSource(path)
    registry = default_registry()
    name = parser_name or registry.detect(source.sample_lines())
    n_chunks = max(int(workers or size), size)
    specs = build_chunk_specs(path, n_chunks, parser_name=name)
    my_specs = specs[rank::size]

    local_partials: list[PartialResult] = [process_chunk(spec) for spec in my_specs]
    if local_partials:
        local = merge_partials(local_partials, worker_id=rank)
    else:
        local = empty_partial(worker_id=rank)

    gathered = comm.gather(local, root=0)
    if rank != 0:
        return None
    assert gathered is not None
    return merge_partials(list(gathered), worker_id=-1)
