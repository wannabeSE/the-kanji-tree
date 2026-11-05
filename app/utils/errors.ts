/** Readable message from a failed $fetch call. */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong",
) {
  const e = error as {
    data?: { statusMessage?: string };
    statusMessage?: string;
  };
  return e?.data?.statusMessage || e?.statusMessage || fallback;
}
