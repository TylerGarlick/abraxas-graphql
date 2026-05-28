import { object, string, pattern, size } from 'superstruct';

export const UserInputSchema = object({
  username: size(string(), 3, 100),
  email: pattern(string(), /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});
