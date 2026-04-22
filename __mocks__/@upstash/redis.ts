export class Redis {
  async get<T>(_key: string): Promise<T | null> {
    return null
  }
  async set(_key: string, _value: unknown, _opts?: unknown): Promise<string> {
    return 'OK'
  }
  async incr(_key: string): Promise<number> {
    return 1
  }
  async expire(_key: string, _seconds: number): Promise<number> {
    return 1
  }
}
