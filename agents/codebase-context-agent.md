# Codebase Context Agent

Retrieves relevant code context for a task using embeddings + pgvector similarity search, then returns `FileContext[]` for the coding agent.

## Inputs

- `jobId` (UUID, required): correlation id used for structured logging.
- `taskDescription` (string, required): natural language description of the requested implementation.
- `repoId` (string, optional): logical repo id used in `codebase_chunks.repo_id`.
- `topK` (positive integer, optional): nearest chunk count to retrieve.
- `pathPrefix` (string, optional): restrict retrieval to paths starting with this prefix.

If `repoId` or `topK` are omitted, the agent uses env defaults:

- `CODEBASE_CONTEXT_DEFAULT_REPO_ID` (optional fallback for `repoId`)
- `CODEBASE_CONTEXT_TOP_K` (optional fallback for `topK`, default `8`)

## Outputs

Discriminated union:

- Success:
  - `status: "success"`
  - `jobId`
  - `repoId`
  - `relevantFiles: FileContext[]` (**non-empty**, compatible with `CodingAgentInput.relevantFiles`)
  - `retrieval` metadata: `topK`, optional `pathPrefix`, and `chunkMatches` (path/chunkIndex/score)
- Error:
  - `status: "error"`
  - `jobId`
  - `repoId`
  - `code`: `no_relevant_chunks` or `no_resolved_files`
  - `message`

The agent does **not** return a success payload with an empty `relevantFiles` array.

## Retrieval flow

1. Embed `taskDescription` with the shared embeddings client.
2. Query `codebase_chunks` by cosine distance (`embedding <=> query_vector`) with `topK`.
3. Deduplicate matched file paths.
4. Load all stored chunks for those files and reconstruct file content in chunk order.
5. Return validated output (`z.array(FileContextSchema).min(1)` on success).

## Failure modes

- `no_relevant_chunks`: similarity search returned zero matches.
- `no_resolved_files`: matches existed, but no file payloads could be reconstructed.
- Configuration/runtime failures throw:
  - missing `repoId` and no `CODEBASE_CONTEXT_DEFAULT_REPO_ID`
  - invalid `CODEBASE_CONTEXT_TOP_K`
  - embedding client or database query failures

## Logging

The agent creates a `jobId`-bound logger via `createJobLogger(jobId)`. Every log line includes `jobId`.
