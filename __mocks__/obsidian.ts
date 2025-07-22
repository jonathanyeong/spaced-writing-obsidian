// Inspired by https://github.com/blacksmithgu/obsidian-dataview/blob/5ad0994ff384cbb797de382e7edff2388141b73a/__mocks__/obsidian.ts
import EventEmitter from "events";

/** Basic obsidian abstraction for any file or folder in a vault. */
export abstract class TAbstractFile {
    /**
     * @public
     */
    vault: Vault;
    /**
     * @public
     */
    path: string;
    /**
     * @public
     */
    name: string;
    /**
     * @public
     */
    parent: TFolder;
}

/** Tracks file created/modified time as well as file system size. */
export interface FileStats {
    /** @public */
    ctime: number;
    /** @public */
    mtime: number;
    /** @public */
    size: number;
}

/** A regular file in the vault. */
export class TFile extends TAbstractFile {
    stat: FileStats;
    basename: string;
    extension: string;
}

/** A folder in the vault. */
export class TFolder extends TAbstractFile {
    children: TAbstractFile[];

    isRoot(): boolean {
        return false;
    }
}

export class Vault extends EventEmitter {
    getFiles() {
        return [];
    }
    trigger(name: string, ...data: unknown[]): void {
        this.emit(name, ...data);
    }

    // Add mock methods needed for tests
    async create(path: string, content: string): Promise<TFile | null> {
        throw new Error('Mock not implemented');
    }

    async read(file: TFile): Promise<string> {
        throw new Error('Mock not implemented');
    }

    async modify(file: TFile, content: string): Promise<void> {
        throw new Error('Mock not implemented');
    }

    async rename(file: TFile, newPath: string): Promise<void> {
        throw new Error('Mock not implemented');
    }

    getFileByPath(path: string): TFile | null {
        throw new Error('Mock not implemented');
    }

    getAbstractFileByPath(path: string): TAbstractFile | null {
        throw new Error('Mock not implemented');
    }
}

export class Component {
    registerEvent() {}
}