declare global {
  const Bun: {
    file(path: string): {
      text(): Promise<string>;
    };
    write(path: string, data: string | Uint8Array): Promise<number>;
  };
}

export {};
