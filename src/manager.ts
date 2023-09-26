import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { Uri } from "vscode";
import exp = require("constants");

let gitBlogMananger = vscode.window.createOutputChannel("git-blog-manager");
let config = vscode.workspace.getConfiguration("git-blog-manager");
let postsRoot = config.get("postsRoot") as string;
let blogURL = config.get("blogURL") as string;
let defaultPostState = config.get("defaultPostState") as string;

export class PostItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly ifPost: boolean,
        public readonly fullPath: string,
        public readonly title: string,
        public readonly body: string,
        public readonly postState: string,
        public readonly remoteHash: string
    ) {
        super(label, collapsibleState);
        if (this.ifPost && postState !== "delete") {
            let tooltip = new vscode.MarkdownString(title + "\n" + body);
            tooltip.supportHtml = true;
            this.tooltip = tooltip;
        }
        if (this.ifPost) {
            this.iconPath = path.join(
                __filename,
                "..",
                "..",
                "icon",
                "folder-markdown.svg"
            );
            this.contextValue = "post";

            if (postState !== "delete") {
                let localHash = child_process.execSync("git rev-parse main", {
                    cwd: fullPath,
                });
                let gitStatus = child_process.execSync("git status", {
                    cwd: fullPath,
                });
                if (
                    localHash.toString().includes(this.remoteHash) &&
                    gitStatus.toString().includes("nothing to commit")
                ) {
                    this.description = "synced";
                } else {
                    this.description = "not synced";
                }
            }

            this.command = {
                title: "",
                command: "vscode.openFolder",
                arguments: [Uri.file(fullPath)],
            };
        } else {
            if (collapsibleState) {
                this.iconPath = vscode.ThemeIcon.Folder;
                this.command = {
                    title: "",
                    command: "vscode.openFolder",
                    arguments: [Uri.file(fullPath)],
                };
            } else {
                this.iconPath = vscode.ThemeIcon.File;
                this.command = {
                    title: "",
                    command: "vscode.open",
                    arguments: [Uri.file(fullPath)],
                };
            }
        }
    }
}

export class DraftPostsProvider implements vscode.TreeDataProvider<PostItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PostItem | undefined> =
        new vscode.EventEmitter<PostItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<PostItem | undefined> =
        this._onDidChangeTreeData.event;

    constructor(private postsRoot: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: PostItem): vscode.TreeItem {
        return element;
    }

    getChildren(
        element?: PostItem | undefined
    ): vscode.ProviderResult<PostItem[]> {
        if (!this.postsRoot) {
            vscode.window.showInformationMessage("Posts path not found!");
            return Promise.resolve([]);
        }
        const rootFlag = element ? false : true;

        if (rootFlag) {
            let posts = checkPosts();
            posts = Promise.resolve(posts);
            return posts.then((posts) => {
                var draftPosts: PostItem[] = [];
                if (posts) {
                    for (let post of posts) {
                        if (post.postState === "delete") {
                            draftPosts.push(post);
                        }
                    }
                    return draftPosts;
                } else {
                    return [];
                }
            });
        }

        return new Promise((resolve) => {
            const folder = element ? element.fullPath : this.postsRoot;
            fs.readdir(folder, (err, files) => {
                if (err) {
                    vscode.window.showInformationMessage(
                        "Error reading directory"
                    );
                    resolve([]);
                } else {
                    const items: PostItem[] = files
                        .filter((file) => !file.startsWith("."))
                        .map((file) => {
                            const fullPath = path.join(folder, file);
                            const isDirectory = fs
                                .statSync(fullPath)
                                .isDirectory();
                            return new PostItem(
                                file,
                                isDirectory
                                    ? vscode.TreeItemCollapsibleState.Collapsed
                                    : vscode.TreeItemCollapsibleState.None,
                                false, // ifPost
                                fullPath, // fullPath,
                                "", // title
                                "", // body
                                "", // postState
                                "" // remoteHash
                            );
                        });
                    // Sort the items array to display folders before files
                    items.sort((a, b) => {
                        if (
                            a.collapsibleState ===
                                vscode.TreeItemCollapsibleState.Collapsed &&
                            b.collapsibleState ===
                                vscode.TreeItemCollapsibleState.None
                        ) {
                            return -1;
                        } else if (
                            a.collapsibleState ===
                                vscode.TreeItemCollapsibleState.None &&
                            b.collapsibleState ===
                                vscode.TreeItemCollapsibleState.Collapsed
                        ) {
                            return 1;
                        } else {
                            return a.label.localeCompare(b.label);
                        }
                    });
                    resolve(items);
                }
            });
        });
    }
}

export class PublicPostsProvider implements vscode.TreeDataProvider<PostItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PostItem | undefined> =
        new vscode.EventEmitter<PostItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<PostItem | undefined> =
        this._onDidChangeTreeData.event;

    constructor(private postsRoot: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: PostItem): vscode.TreeItem {
        return element;
    }

    getChildren(
        element?: PostItem | undefined
    ): vscode.ProviderResult<PostItem[]> {
        if (!this.postsRoot) {
            vscode.window.showInformationMessage("Posts path not found!");
            return Promise.resolve([]);
        }
        const rootFlag = element ? false : true;

        if (rootFlag) {
            let posts = checkPosts();
            posts = Promise.resolve(posts);
            return posts.then((posts) => {
                var publicPosts: PostItem[] = [];
                if (posts) {
                    for (let post of posts) {
                        if (post.postState === "public") {
                            publicPosts.push(post);
                        }
                    }
                    return publicPosts;
                } else {
                    return [];
                }
            });
        }

        return new Promise((resolve) => {
            const folder = element ? element.fullPath : this.postsRoot;
            fs.readdir(folder, (err, files) => {
                if (err) {
                    vscode.window.showInformationMessage(
                        "Error reading directory"
                    );
                    resolve([]);
                } else {
                    const items: PostItem[] = files
                        .filter((file) => !file.startsWith("."))
                        .map((file) => {
                            const fullPath = path.join(folder, file);
                            const isDirectory = fs
                                .statSync(fullPath)
                                .isDirectory();
                            return new PostItem(
                                file,
                                isDirectory
                                    ? vscode.TreeItemCollapsibleState.Collapsed
                                    : vscode.TreeItemCollapsibleState.None,
                                false, // ifPost
                                fullPath, // fullPath,
                                "", // title
                                "", // body
                                "", // postState
                                "" //hash
                            );
                        });
                    // Sort the items array to display folders before files
                    items.sort((a, b) => {
                        if (
                            a.collapsibleState ===
                                vscode.TreeItemCollapsibleState.Collapsed &&
                            b.collapsibleState ===
                                vscode.TreeItemCollapsibleState.None
                        ) {
                            return -1;
                        } else if (
                            a.collapsibleState ===
                                vscode.TreeItemCollapsibleState.None &&
                            b.collapsibleState ===
                                vscode.TreeItemCollapsibleState.Collapsed
                        ) {
                            return 1;
                        } else {
                            return a.label.localeCompare(b.label);
                        }
                    });
                    resolve(items);
                }
            });
        });
    }
}

export class PrivatePostsProvider implements vscode.TreeDataProvider<PostItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PostItem | undefined> =
        new vscode.EventEmitter<PostItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<PostItem | undefined> =
        this._onDidChangeTreeData.event;

    constructor(private postsRoot: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: PostItem): vscode.TreeItem {
        return element;
    }

    getChildren(
        element?: PostItem | undefined
    ): vscode.ProviderResult<PostItem[]> {
        if (!this.postsRoot) {
            vscode.window.showInformationMessage("Posts path not found!");
            return Promise.resolve([]);
        }
        const rootFlag = element ? false : true;

        if (rootFlag) {
            let posts = checkPosts();
            posts = Promise.resolve(posts);
            return posts.then((posts) => {
                var privatePosts: PostItem[] = [];
                if (posts) {
                    for (let post of posts) {
                        if (post.postState === "private") {
                            privatePosts.push(post);
                        }
                    }
                    return privatePosts;
                } else {
                    return [];
                }
            });
        }

        return new Promise((resolve) => {
            const folder = element ? element.fullPath : this.postsRoot;
            fs.readdir(folder, (err, files) => {
                if (err) {
                    vscode.window.showInformationMessage(
                        "Error reading directory"
                    );
                    resolve([]);
                } else {
                    const items: PostItem[] = files
                        .filter((file) => !file.startsWith("."))
                        .map((file) => {
                            const fullPath = path.join(folder, file);
                            const isDirectory = fs
                                .statSync(fullPath)
                                .isDirectory();
                            return new PostItem(
                                file,
                                isDirectory
                                    ? vscode.TreeItemCollapsibleState.Collapsed
                                    : vscode.TreeItemCollapsibleState.None,
                                false, // ifPost
                                fullPath, // fullPath,
                                "", // title
                                "", // body
                                "", // postState
                                "" //hash
                            );
                        });
                    // Sort the items array to display folders before files
                    items.sort((a, b) => {
                        if (
                            a.collapsibleState ===
                                vscode.TreeItemCollapsibleState.Collapsed &&
                            b.collapsibleState ===
                                vscode.TreeItemCollapsibleState.None
                        ) {
                            return -1;
                        } else if (
                            a.collapsibleState ===
                                vscode.TreeItemCollapsibleState.None &&
                            b.collapsibleState ===
                                vscode.TreeItemCollapsibleState.Collapsed
                        ) {
                            return 1;
                        } else {
                            return a.label.localeCompare(b.label);
                        }
                    });
                    resolve(items);
                }
            });
        });
    }
}

export let draftPostsProvider = new DraftPostsProvider(postsRoot);
export let publicPostsProvider = new PublicPostsProvider(postsRoot);
export let privatePostsProvider = new PrivatePostsProvider(postsRoot);

export function refreshTreeView() {
    draftPostsProvider.refresh();
    publicPostsProvider.refresh();
    privatePostsProvider.refresh();
}

export function checkPostsList() {
    // check if _pages folder exists
    gitBlogMananger.appendLine("Checking _pages folder...");
    if (!fs.existsSync(path.join(postsRoot, "_pages"))) {
        // clone the _pages repo from blogURL
        let output = child_process.execSync(
            `git clone ${blogURL}/_pages ${path.join(postsRoot, "_pages")}`,
            {
                cwd: postsRoot,
            }
        );
        gitBlogMananger.appendLine(output.toString());
    } else {
        // pull the _pages repo
        let output = child_process.execSync(`git pull`, {
            cwd: path.join(postsRoot, "_pages"),
        });
        gitBlogMananger.appendLine(output.toString());
    }
}

export function checkPosts(): vscode.ProviderResult<PostItem[]> {
    // read postsList.json from _pages folder
    let postsList = JSON.parse(
        fs.readFileSync(path.join(postsRoot, "_pages", "postsList.json"), {
            encoding: "utf-8",
        })
    );

    return new Promise((resolve) => {
        fs.readdir(postsRoot, (err, files) => {
            if (err) {
                vscode.window.showInformationMessage("Error reading directory");
                resolve([]);
            } else {
                const items: PostItem[] = files
                    .filter(
                        (file) =>
                            !file.startsWith(".") &&
                            !file.startsWith("_") &&
                            fs
                                .statSync(path.join(postsRoot, file))
                                .isDirectory()
                    )
                    .map((file) => {
                        const fullPath = path.join(postsRoot, file);

                        for (let post of postsList) {
                            if (post.Name === file) {
                                let tooltip = new vscode.MarkdownString(
                                    post.Title + "\n" + post.Body
                                );
                                tooltip.supportHtml = true;

                                return new PostItem(
                                    file, // label
                                    vscode.TreeItemCollapsibleState.Collapsed, // collapsibleState
                                    true, // ifPost
                                    fullPath, // fullPath,
                                    post.Title, // title
                                    post.Body, // body
                                    post.State, // postState
                                    post.Hash // hash
                                );
                            }
                        }
                        return new PostItem(
                            file, // label
                            vscode.TreeItemCollapsibleState.Collapsed, // collapsibleState
                            true, // ifPost
                            fullPath, // fullPath,
                            "", // title
                            "", // body
                            "delete", // postState
                            "" // hash
                        );
                    });
                // Sort the items array to display folders before files
                items.sort((a: PostItem, b: PostItem) => {
                    return a.label.localeCompare(b.label);
                });
                resolve(items);
            }
        });
    });
}

export function syncAllPosts() {
    if (!fs.existsSync(postsRoot)) {
        fs.mkdirSync(postsRoot);
    }

    if (blogURL === "") {
        vscode.window.showInformationMessage(
            "Please set your blogURL in settings"
        );
        return;
    }

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Syncing posts",
            cancellable: false,
        },
        (progress) => {
            progress.report({ increment: 0, message: "Checking post list..." });
            checkPostsList();
            // read postsList.json from _pages folder
            let postsList = JSON.parse(
                fs.readFileSync(
                    path.join(postsRoot, "_pages", "postsList.json"),
                    {
                        encoding: "utf-8",
                    }
                )
            );

            postsList = postsList.filter(
                (post: { Name: string }) => !post.Name.startsWith("_")
            );

            // check if all posts in postsList.json exist in postsRoot
            let postNum = postsList.length;
            for (let i = 0; i < postNum; i++) {
                progress.report({
                    increment: 100 / postNum,
                    message: `Checking ${i + 1} / ${postNum} posts...`,
                });
                let post = postsList[i];
                gitBlogMananger.appendLine(`Checking ${post.Name}...`);
                if (!fs.existsSync(path.join(postsRoot, post.Name))) {
                    // if not, clone the repo
                    let output = child_process.execSync(
                        `git clone ${blogURL}/${post.Name}`,
                        {
                            cwd: postsRoot,
                        }
                    );
                    gitBlogMananger.appendLine(output.toString());
                } else {
                    let localHash = child_process.execSync(
                        `git rev-parse main`,
                        {
                            cwd: path.join(postsRoot, post.Name),
                        }
                    );
                    if (!localHash.toString().includes(post.Hash)) {
                        let output = child_process.execSync(
                            `git pull --rebase`,
                            {
                                cwd: path.join(postsRoot, post.Name),
                            }
                        );
                        gitBlogMananger.appendLine(output.toString());
                    }
                }
            }
            return Promise.resolve();
        }
    );

    refreshTreeView();
}

export function syncPost(post: PostItem) {
    let postName = post.label;
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Syncing post",
            cancellable: false,
        },
        (process) => {
            process.report({ increment: 0, message: "Syncing ..." });
            let output = child_process.execSync(`git status`, {
                cwd: path.join(postsRoot, postName),
            });
            let gitStatus = output.toString();
            gitBlogMananger.appendLine(gitStatus);

            if (gitStatus.includes("nothing to commit")) {
                output = child_process.execSync(`git pull --rebase`, {
                    cwd: path.join(postsRoot, postName),
                });
                gitBlogMananger.appendLine(output.toString());
            } else {
                output = child_process.execSync(
                    `git add . && git commit -m "update" && git pull --rebase`,
                    {
                        cwd: path.join(postsRoot, postName),
                    }
                );
                gitBlogMananger.appendLine(output.toString());
            }

            output = child_process.execSync(`git status`, {
                cwd: path.join(postsRoot, postName),
            });
            gitStatus = output.toString();
            gitBlogMananger.appendLine(gitStatus);
            console.log(gitStatus);
            if (!gitStatus.includes("Your branch is up to date with")) {
                process.report({ increment: 40, message: "Pushing..." });
                output = child_process.execSync(`git push -u origin main`, {
                    cwd: path.join(postsRoot, postName),
                });
                gitBlogMananger.appendLine(output.toString());
                gitBlogMananger.appendLine("Post synced.");
            }

            process.report({
                increment: 40,
                message: "Refresh post list.",
            });
            // refresh the tree view
            checkPostsList();
            refreshTreeView();
            process.report({ increment: 20, message: "Done." });
            return Promise.resolve();
        }
    );
}

export function newPost() {
    let postName = vscode.window.showInputBox({
        prompt: "Enter the name of the new post folder.",
        validateInput: (postName) => {
            return postName === "" ? "Post name cannot be empty." : null;
        },
    });
    // check if the post name exists
    postName.then((postName) => {
        if (postName) {
            if (fs.existsSync(path.join(postsRoot, postName))) {
                vscode.window.showInformationMessage(
                    "Post name already exists. Please choose another name."
                );
                return;
            }
            // create the post folder
            gitBlogMananger.appendLine(`Creating post folder ${postName}...`);
            fs.mkdirSync(path.join(postsRoot, postName));
            // git init the post folder
            let output = child_process.execSync(
                `git init --initial-branch=main`,
                {
                    cwd: path.join(postsRoot, postName),
                }
            );
            gitBlogMananger.appendLine(output.toString());
            // add the remote
            output = child_process.execSync(
                `git remote add origin ${blogURL}/${postName}`,
                {
                    cwd: path.join(postsRoot, postName),
                }
            );
            gitBlogMananger.appendLine(output.toString());
            // create the README.md file
            fs.writeFileSync(
                path.join(postsRoot, postName, "README.md"),
                `# ${postName}`
            );
            // add the README.md file
            output = child_process.execSync(`git add .`, {
                cwd: path.join(postsRoot, postName),
            });
            gitBlogMananger.appendLine(output.toString());
            // commit the README.md file
            output = child_process.execSync(`git commit -m "init"`, {
                cwd: path.join(postsRoot, postName),
            });
            gitBlogMananger.appendLine(output.toString());
            gitBlogMananger.appendLine("Post created.");
            // refresh the tree view
            draftPostsProvider.refresh();
        }
    });
}

export function publishPost(post: PostItem) {
    let postName = post.label;
    // git push the post folder
    gitBlogMananger.appendLine(`Publishing post ${postName}...`);
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Publishing posts",
            cancellable: false,
        },
        (process) => {
            changePostState(post, defaultPostState);
            process.report({ increment: 60, message: "Pushing..." });
            gitBlogMananger.appendLine(`run git push -u origin main`);
            let output = child_process.execSync(`git push -u origin main`, {
                cwd: path.join(postsRoot, postName),
            });
            gitBlogMananger.appendLine(output.toString());
            gitBlogMananger.appendLine("Post published.");

            process.report({
                increment: 40,
                message: "Refresh post list.",
            });
            // refresh the tree view
            checkPostsList();
            refreshTreeView();
            process.report({ increment: 20, message: "Done." });
            return Promise.resolve();
        }
    );
}

export function deletePost(post: PostItem) {
    let postName = post.label;
    if (post.postState === "delete") {
        // delete the post folder
        gitBlogMananger.appendLine(`Deleting post folder ${postName}...`);
        fs.rmdirSync(path.join(postsRoot, postName), { recursive: true });
        gitBlogMananger.appendLine("Post deleted.");
        // refresh the tree view
        draftPostsProvider.refresh();
    } else {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "Deleting posts",
                cancellable: false,
            },
            (process) => {
                process.report({
                    increment: 20,
                    message: "Change post state ...",
                });
                changePostState(post, "delete");

                process.report({
                    increment: 40,
                    message: "Deleting from server...",
                });
                let output = child_process.execSync(`git pull --rebase`, {
                    cwd: path.join(postsRoot, postName),
                });
                gitBlogMananger.appendLine(output.toString());
                output = child_process.execSync(`git push -u origin main`, {
                    cwd: path.join(postsRoot, postName),
                });
                gitBlogMananger.appendLine(output.toString());

                process.report({
                    increment: 40,
                    message: "Refresh post list.",
                });

                checkPostsList();
                refreshTreeView();
                process.report({ increment: 20, message: "Done." });
                return Promise.resolve();
            }
        );
    }
}

export function openPostURL(post: PostItem) {
    let postName = post.label;
    vscode.env.openExternal(vscode.Uri.parse(`${blogURL}/posts/${postName}`));
}

export function hidePost(post: PostItem) {
    let postName = post.label;

    let localHash = child_process.execSync("git rev-parse main", {
        cwd: post.fullPath,
    });
    if (!localHash.toString().includes(post.remoteHash)) {
        syncPost(post);
    }

    gitBlogMananger.appendLine(`Change state of post ${postName}...`);
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Hiding posts",
            cancellable: false,
        },
        (process) => {
            changePostState(post, "private");
            process.report({ increment: 60, message: "Pushing..." });
            gitBlogMananger.appendLine(`run git push -u origin main`);
            let output = child_process.execSync(`git push -u origin main`, {
                cwd: path.join(postsRoot, postName),
            });
            gitBlogMananger.appendLine(output.toString());
            gitBlogMananger.appendLine("Post published.");

            process.report({
                increment: 40,
                message: "Refresh post list.",
            });
            // refresh the tree view
            checkPostsList();
            refreshTreeView();
            process.report({ increment: 20, message: "Done." });
            return Promise.resolve();
        }
    );
}

export function unhidePost(post: PostItem) {
    let postName = post.label;

    let localHash = child_process.execSync("git rev-parse main", {
        cwd: post.fullPath,
    });
    if (!localHash.toString().includes(post.remoteHash)) {
        syncPost(post);
    }

    gitBlogMananger.appendLine(`Change state of post ${postName}...`);
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Unhiding posts",
            cancellable: false,
        },
        (process) => {
            changePostState(post, "public");
            process.report({ increment: 60, message: "Pushing..." });
            gitBlogMananger.appendLine(`run git push -u origin main`);
            let output = child_process.execSync(`git push -u origin main`, {
                cwd: path.join(postsRoot, postName),
            });
            gitBlogMananger.appendLine(output.toString());
            gitBlogMananger.appendLine("Post published.");

            process.report({
                increment: 40,
                message: "Refresh post list.",
            });
            // refresh the tree view
            checkPostsList();
            refreshTreeView();
            process.report({ increment: 20, message: "Done." });
            return Promise.resolve();
        }
    );
}

function changePostState(post: PostItem, state: string) {
    let postName = post.label;
    let postState = post.postState;
    if (postState === state) {
        return;
    }
    // read the first line of README.md
    let readme = fs.readFileSync(
        path.join(postsRoot, postName, "README.md"),
        "utf-8"
    );
    let lines = readme.split("\n");
    let firstLine = lines[0];
    // check if the first line is a comment
    if (
        !firstLine.startsWith("<!-- public -->") &&
        !firstLine.startsWith("<!-- private -->") &&
        !firstLine.startsWith("<!-- delete -->")
    ) {
        // if not, add a comment
        firstLine = "<!-- " + state + " -->\n" + firstLine;
    } else {
        firstLine = firstLine.replace(postState, state);
    }
    // write the first line of README.md
    lines[0] = firstLine;
    fs.writeFileSync(
        path.join(postsRoot, postName, "README.md"),
        lines.join("\n")
    );
    let output = child_process.execSync(
        `git add . && git commit -m "change post state"`,
        {
            cwd: path.join(postsRoot, postName),
        }
    );
    gitBlogMananger.appendLine(output.toString());
}
