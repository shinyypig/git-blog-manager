// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as manager from "./manager";
import * as path from "path";
import { watch } from "fs";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    let config = vscode.workspace.getConfiguration("git-blog-manager");
    let postsRoot = config.get("postsRoot") as string;
    let blogURL = config.get("blogURL") as string;
    if (!blogURL) {
        vscode.window.showInformationMessage("Blog URL not found!");
        return;
    }
    if (!postsRoot) {
        vscode.window.showInformationMessage("Posts path not found!");
        return;
    }

    let syncAllPosts = vscode.commands.registerCommand(
        "git-blog-manager.syncAllPosts",
        () => {
            manager.syncAllPosts();
        }
    );
    let newPost = vscode.commands.registerCommand(
        "git-blog-manager.newPost",
        () => {
            manager.newPost();
        }
    );
    let publishPost = vscode.commands.registerCommand(
        "git-blog-manager.publishPost",
        (post: manager.PostItem) => {
            manager.publishPost(post);
        }
    );
    let deletePost = vscode.commands.registerCommand(
        "git-blog-manager.deletePost",
        (post: manager.PostItem) => {
            manager.deletePost(post);
        }
    );
    let syncPost = vscode.commands.registerCommand(
        "git-blog-manager.syncPost",
        (post: manager.PostItem) => {
            manager.syncPost(post);
        }
    );
    let openPostURL = vscode.commands.registerCommand(
        "git-blog-manager.openPostURL",
        (post: manager.PostItem) => {
            manager.openPostURL(post);
        }
    );
    let hidePost = vscode.commands.registerCommand(
        "git-blog-manager.hidePost",
        (post: manager.PostItem) => {
            manager.hidePost(post);
        }
    );
    let unhidePost = vscode.commands.registerCommand(
        "git-blog-manager.unhidePost",
        (post: manager.PostItem) => {
            manager.unhidePost(post);
        }
    );
    context.subscriptions.push(syncAllPosts, newPost);

    if (postsRoot && postsRoot.length > 0) {
        vscode.window.createTreeView("draftPosts", {
            treeDataProvider: manager.draftPostsProvider,
        });
        vscode.window.createTreeView("publicPosts", {
            treeDataProvider: manager.publicPostsProvider,
        });
        vscode.window.createTreeView("privatePosts", {
            treeDataProvider: manager.privatePostsProvider,
        });
    } else {
        vscode.window.showInformationMessage("Posts path not found!");
    }

    const globPattern = new vscode.RelativePattern(postsRoot, "**/**/[^.]*");

    let watcher = vscode.workspace.createFileSystemWatcher(
        globPattern,
        false, // ignoreCreateEvents
        false, // ignoreChangeEvents
        false // ignoreDeleteEvents
    );

    watcher.onDidCreate((uri) => {
        if (!uri.path.includes(".git")) {
            manager.refreshTreeView();
        }
    });

    watcher.onDidChange((uri) => {
        if (!uri.path.includes(".git")) {
            manager.refreshTreeView();
        }
    });

    watcher.onDidDelete((uri) => {
        if (!uri.path.includes(".git")) {
            manager.refreshTreeView();
        }
    });

    // Make sure to dispose the watcher when you are done with it
    context.subscriptions.push(watcher);
}

// This method is called when your extension is deactivated
export function deactivate() {}
