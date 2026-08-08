# Do not import parallel here: ProcessPool workers import sequential and would
# otherwise circular-import process_chunk on Windows spawn.
from app.hpc.engines.sequential import analyze_file, analyze_lines, analyze_source

__all__ = ["analyze_file", "analyze_lines", "analyze_source"]
