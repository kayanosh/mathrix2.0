import { withTransientOpenAIRetry } from "@/lib/openai-retry";

describe("withTransientOpenAIRetry", () => {
  it("retries the observed transient permission error once", async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(
        Object.assign(new Error("You have insufficient permissions for this operation."), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce("ok");

    await expect(withTransientOpenAIRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry ordinary authentication failures", async () => {
    const error = Object.assign(new Error("Invalid API key"), { status: 401 });
    const operation = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    await expect(withTransientOpenAIRetry(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
