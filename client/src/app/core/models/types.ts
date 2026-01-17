export interface Introduction {
    id: string;              // Node ID
    number: number;          // Discussion number
    title: string;
    body: string;            // Markdown
    url: string;
    createdAt: string;
    labels: Label[];
    author: {
        login: string;
        avatarUrl: string;
    };
}

export interface Label {
    id: string;
    name: string;
    color: string;           // Hex without #
}

export interface GitHubUser {
    login: string;
    avatarUrl: string;
}

export interface AppState {
    isAuthenticated: boolean;
    currentUser: GitHubUser | null;
}

export interface RepoConfig {
    owner: string;
    repo: string;
    token: string;
}
