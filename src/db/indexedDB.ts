export interface OutlineNode {
  id: string;
  type: 'section' | 'topic' | 'question' | 'answer';
  text: string;
  depth: number;
}

export interface ProjectCommit {
  id: string;
  timestamp: string;
  comment: string;
  nodesSnapshot: OutlineNode[];
  metadataSnapshot: any;
}

export interface ReviewComment {
  id: string;
  lineId: string;
  commentText: string;
  solved: boolean;
}

export interface ProjectMetadata {
  writingGoal: string;
  targetAudience: string;
  researchObjective: string;
  researchQuestion: string;
  subResearchQuestions: string[];
  pageSize: string;
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  maxLevel?: number;
  includeHighlighting?: boolean;
  lineSpacing?: number;
  lineHeight?: number;
  indentSpacing?: number;
  levelHighlighting?: { [level: number]: boolean };
  levelLineSpacing?: { [level: number]: number };
  levelLineHeight?: { [level: number]: number };
  levelIndentSpacing?: { [level: number]: number };
  editorLineSpacing?: number;
  editorLineHeight?: number;
  editorIndentSpacing?: number;
  editorLevelLineSpacing?: { [level: number]: number };
  editorLevelLineHeight?: { [level: number]: number };
  editorLevelIndentSpacing?: { [level: number]: number };
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata: ProjectMetadata;
  nodes: OutlineNode[];
  commits: ProjectCommit[];
  reviews: ReviewComment[];
}

const DB_NAME = 'outliner_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create projects store
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }

      // Create config store
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };
  });
}

export function saveProject(project: Project): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  });
}

export function getProject(id: string): Promise<Project | undefined> {
  return initDB().then((db) => {
    return new Promise<Project | undefined>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  });
}

export function deleteProject(id: string): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  });
}

export function getAllProjects(): Promise<Project[]> {
  return initDB().then((db) => {
    return new Promise<Project[]>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  });
}

export function saveConfig(key: string, value: any): Promise<void> {
  return initDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('config', 'readwrite');
      const store = transaction.objectStore('config');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  });
}

export function getConfig(key: string): Promise<any> {
  return initDB().then((db) => {
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction('config', 'readonly');
      const store = transaction.objectStore('config');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  });
}
