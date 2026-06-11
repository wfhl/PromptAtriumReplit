export interface PromptCrudItem {
  id: string;
  name: string;
  promptContent: string;
  description?: string | null;
  tags?: string[] | null;
  promptType?: string | null;
  category?: string | null;
  isPublic?: boolean | null;
  isNsfw?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  userId?: string | null;
}

export interface PromptCreateInput {
  name: string;
  promptContent: string;
  description?: string;
  tags?: string[];
  promptType?: string;
  category?: string;
  isPublic?: boolean;
}

export interface PromptCrudAdapter {
  list(params?: { search?: string }): Promise<PromptCrudItem[]>;
  get(id: string): Promise<PromptCrudItem>;
  create(input: PromptCreateInput): Promise<PromptCrudItem>;
  update(id: string, input: Partial<PromptCreateInput>): Promise<PromptCrudItem>;
  delete(id: string): Promise<void>;
}

export interface AuthConfig {
  getToken: () => string | null | Promise<string | null>;
  apiBase?: string;
}
