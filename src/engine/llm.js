// One small interface for model calls, so the engine runs the same on Forge and in local tests.
//   llm.text(system, prompt)          -> string
//   llm.json(system, prompt, schema)  -> object
//   llm.usage                         -> { calls, input, output }
// On Forge, json() forces a tool call, because Forge LLMs have no JSON mode. If the model answers in text
// anyway, the text is parsed the same way the blind test parsed it.
import { parseJson } from './tokens.js';

const textOf = (content) => (typeof content === 'string' ? content : (content || []).map((p) => p.text || '').join(''));

/** chat: the @forge/llm chat function (injected so tests can pass a fake). */
export function forgeLlm(chat, { model = 'claude-sonnet-4-6', maxTokens = 1500, temperature } = {}) {
  const usage = { calls: 0, input: 0, output: 0 };
  const call = async (body) => {
    const r = await chat({ model, max_completion_tokens: maxTokens, ...(temperature === undefined ? {} : { temperature }), ...body });
    usage.calls += 1; usage.input += r.usage?.input_tokens || 0; usage.output += r.usage?.output_tokens || 0;
    return r.choices?.[0]?.message || {};
  };
  const messages = (system, prompt) => [{ role: 'system', content: system }, { role: 'user', content: prompt }];
  return {
    usage,
    model,
    async text(system, prompt) { return textOf((await call({ messages: messages(system, prompt) })).content); },
    async json(system, prompt, schema) {
      const msg = await call({
        messages: messages(system, prompt),
        tools: [{ type: 'function', function: { name: 'answer', description: 'Return the answer in the required JSON shape.', parameters: schema } }],
        tool_choice: { type: 'function', function: { name: 'answer' } },
      });
      const tc = msg.tool_calls?.[0];
      if (tc) return typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      return parseJson(textOf(msg.content));
    },
  };
}

/** Wrap a plain text function (prompt, system) -> string, e.g. a local CLI. json() parses the text, as in the blind test. */
export function textLlm(fn) {
  const usage = { calls: 0, input: 0, output: 0 };
  return {
    usage,
    model: 'local',
    async text(system, prompt) { usage.calls += 1; return fn(prompt, system); },
    async json(system, prompt) { usage.calls += 1; return parseJson(await fn(prompt, system)); },
  };
}
