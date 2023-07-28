// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as manager from "./manager";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "git-blog-manager" is now active!'
    );
    let config = vscode.workspace.getConfiguration("git-blog-manager");
    let postsRoot = config.get("postsRoot") as string;
    let blogURL = config.get("blogURL") as string;

    let syncPosts = vscode.commands.registerCommand(
        "git-blog-manager.syncPosts",
        () => {
            manager.syncPosts();
        }
    );
    context.subscriptions.push(syncPosts);

    if (postsRoot && postsRoot.length > 0) {
        vscode.window.createTreeView("publicPosts", {
            treeDataProvider: new manager.PostsProvider(postsRoot),
        });
    } else {
        vscode.window.showInformationMessage("Posts path not found!");
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
