import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Introduction, Label } from '../models/types';
import { map, Observable, switchMap, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

const GITHUB_API = 'https://api.github.com/graphql';

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private get headers() {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.auth.token()}`,
      'Content-Type': 'application/json'
    });
  }

  private get owner(): string {
    return environment.github.owner;
  }

  private get repo(): string {
    return environment.github.repo;
  }

  // Query to get repository ID and Discussion Category ID
  private getRepoInfoQuery = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        discussionCategories(first: 10) {
          nodes {
            id
            name
            emoji
          }
        }
      }
    }
  `;

  // Query to get discussions
  private getDiscussionsQuery = `
    query($owner: String!, $repo: String!, $categoryId: ID!) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 50, categoryId: $categoryId, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            id
            number
            title
            body
            url
            createdAt
            labels(first: 10) {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      }
    }
  `;

  // Query to get repository labels
  private getLabelsQuery = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        labels(first: 100) {
          nodes {
            id
            name
            color
          }
        }
      }
    }
  `;

  // Mutations
  private createDiscussionMutation = `
    mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
        discussion {
          id
          number
          url
        }
      }
    }
  `;

  private addLabelsMutation = `
    mutation($id: ID!, $labelIds: [ID!]!) {
      addLabelsToLabelable(input: {labelableId: $id, labelIds: $labelIds}) {
        clientMutationId
      }
    }
  `;

  private updateDiscussionMutation = `
    mutation($id: ID!, $title: String, $body: String) {
      updateDiscussion(input: {discussionId: $id, title: $title, body: $body}) {
        discussion {
          id
          url
        }
      }
    }
  `;

  private deleteDiscussionMutation = `
    mutation($id: ID!) {
      deleteDiscussion(input: {id: $id}) {
        clientMutationId
      }
    }
  `;

  // Get Repository ID and Category ID
  private getContext(): Observable<{ repoId: string; categoryId: string }> {
    if (!this.auth.isAuthenticated()) {
      return of({ repoId: '', categoryId: '' });
    }

    return this.http.post<any>(GITHUB_API, {
      query: this.getRepoInfoQuery,
      variables: { owner: this.owner, repo: this.repo }
    }, { headers: this.headers }).pipe(
      map(res => {
        const repository = res.data?.repository;
        if (!repository) throw new Error('Repository not found');

        const categories = repository.discussionCategories.nodes;
        const category = categories.find((c: any) =>
          c.name.toLowerCase().includes('introduction')
        ) || categories[0];

        if (!category) throw new Error('No discussion category found');

        return {
          repoId: repository.id,
          categoryId: category.id
        };
      })
    );
  }

  getDiscussions(): Observable<Introduction[]> {
    if (!this.auth.isAuthenticated()) {
      return of([]);
    }

    return this.getContext().pipe(
      switchMap(ctx => {
        return this.http.post<any>(GITHUB_API, {
          query: this.getDiscussionsQuery,
          variables: { owner: this.owner, repo: this.repo, categoryId: ctx.categoryId }
        }, { headers: this.headers });
      }),
      map(res => {
        const nodes = res.data?.repository?.discussions?.nodes || [];
        return nodes.map((node: any) => ({
          ...node,
          labels: node.labels?.nodes || []
        }));
      }),
      catchError(err => {
        console.error('API Error:', err);
        return of([]);
      })
    );
  }

  getRepoLabels(): Observable<Label[]> {
    if (!this.auth.isAuthenticated()) {
      return of([]);
    }

    return this.http.post<any>(GITHUB_API, {
      query: this.getLabelsQuery,
      variables: { owner: this.owner, repo: this.repo }
    }, { headers: this.headers }).pipe(
      map(res => res.data?.repository?.labels?.nodes || []),
      catchError(() => of([]))
    );
  }

  createIntroduction(title: string, body: string, labelIds: string[] = []): Observable<any> {
    return this.getContext().pipe(
      switchMap(ctx => {
        return this.http.post<any>(GITHUB_API, {
          query: this.createDiscussionMutation,
          variables: {
            repositoryId: ctx.repoId,
            categoryId: ctx.categoryId,
            title,
            body
          }
        }, { headers: this.headers }).pipe(
          switchMap(res => {
            const discussionId = res.data?.createDiscussion?.discussion?.id;
            if (discussionId && labelIds.length > 0) {
              return this.http.post<any>(GITHUB_API, {
                query: this.addLabelsMutation,
                variables: { id: discussionId, labelIds }
              }, { headers: this.headers });
            }
            return of(res);
          })
        );
      })
    );
  }

  updateIntroduction(id: string, title: string, body: string, labelIds: string[] = []): Observable<any> {
    return this.http.post<any>(GITHUB_API, {
      query: this.updateDiscussionMutation,
      variables: { id, title, body }
    }, { headers: this.headers }).pipe(
      switchMap(res => {
        if (labelIds.length > 0) {
          return this.http.post<any>(GITHUB_API, {
            query: this.addLabelsMutation,
            variables: { id, labelIds }
          }, { headers: this.headers });
        }
        return of(res);
      })
    );
  }

  deleteIntroduction(id: string): Observable<any> {
    return this.http.post<any>(GITHUB_API, {
      query: this.deleteDiscussionMutation,
      variables: { id }
    }, { headers: this.headers });
  }
}
