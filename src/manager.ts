import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";

interface Post {
    Name: string;
    Title: string;
    Body: string;
    Banner: string;
    Mtime: string;
    State: string;
}

export function syncPosts(): Post[] {
    let config = vscode.workspace.getConfiguration("git-blog-manager");
    let postsRoot = config.get("postsRoot") as string;
    let blogURL = config.get("blogURL") as string;
    console.log(postsRoot);
    console.log(blogURL);

    // check if _pages folder exists
    if (!fs.existsSync(path.join(postsRoot, "_pages"))) {
        // clone the _pages repo from blogURL
        let output = child_process.execSync(
            `git clone ${blogURL} ${path.join(postsRoot, "_pages")}`,
            {
                cwd: postsRoot,
            }
        );
        console.log(output.toString());
    } else {
        // pull the _pages repo
        let output = child_process.execSync(`git pull`, {
            cwd: path.join(postsRoot, "_pages"),
        });
        console.log(output.toString());
    }

    // read postsList.json from _pages folder
    let postsList = JSON.parse(
        fs.readFileSync(path.join(postsRoot, "_pages", "postsList.json"), {
            encoding: "utf-8",
        })
    );
    postsList = postsList as Post[];

    // check if all posts in postsList.json exist in postsRoot
    postsList.forEach((post: any) => {
        if (!fs.existsSync(path.join(postsRoot, post.Name))) {
            // if not, clone the repo
            console.log(`git clone  ${blogURL}/${post.Name}`);
            let output = child_process.execSync(
                `git clone ${blogURL}/${post.Name}`,
                {
                    cwd: postsRoot,
                }
            );
            console.log(output.toString());
        } else {
            let output = child_process.execSync(`git pull`, {
                cwd: path.join(postsRoot, post.Name),
            });
            console.log(output.toString());
        }
    });

    return postsList;
}

export class PostsProvider implements vscode.TreeDataProvider<PostItem> {
    constructor(private postsRoot: string) {}

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

        return new Promise((resolve) => {
            const rootFlag = element ? false : true;
            const folder = element ? element.fullPath : this.postsRoot;

            fs.readdir(folder, (err, files) => {
                if (err) {
                    vscode.window.showInformationMessage(
                        "Error reading directory"
                    );
                    resolve([]);
                } else {
                    if (rootFlag) {
                        var postsList = syncPosts();
                    }
                    const items: PostItem[] = files
                        .filter((file) => !file.startsWith("."))
                        .map((file) => {
                            const fullPath = path.join(folder, file);
                            const isDirectory = fs
                                .statSync(fullPath)
                                .isDirectory();

                            if (isDirectory && rootFlag) {
                                // check if the folder is a post
                                for (let post of postsList) {
                                    if (post.Name === file) {
                                        return new PostItem(
                                            file, // label
                                            vscode.TreeItemCollapsibleState.Collapsed, // collapsibleState
                                            post.Title, // description
                                            true, // ifPost
                                            post.State, // postState
                                            fullPath // fullPath
                                        );
                                    }
                                }
                            }

                            return new PostItem(
                                file,
                                isDirectory
                                    ? vscode.TreeItemCollapsibleState.Collapsed
                                    : vscode.TreeItemCollapsibleState.None,
                                "",
                                false,
                                "",
                                fullPath
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

class PostItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly description: string,
        public readonly ifPost: boolean,
        public readonly postState: string,
        public readonly fullPath: string
    ) {
        super(label, collapsibleState);
    }
}
