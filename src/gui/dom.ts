import * as vscode from 'vscode';
import * as fs from 'fs';
import { promisifier as promisifier } from '../filesystem';
import { JSDOM } from "jsdom";

export class Dom {
    private jsdom: JSDOM;
    private _origjsdom: JSDOM;
    private projectRoot: vscode.Uri;

    private constructor() { }

    public static async initAsync(projectRoot: vscode.Uri) {
        const instance = new Dom();
        await instance.init(projectRoot);
        return instance;
    }

    private async init(projectRoot: vscode.Uri) {
        this.projectRoot = projectRoot;
        this.jsdom = await this.getHtmlPageAsync('main.html');
    }

    public setDom(dom: JSDOM) {
        this.jsdom = dom;
    }

    public async getHtmlAsync(reset?: boolean): Promise<JSDOM> {
        if (this.jsdom && !reset) {
            return this.jsdom;
        }
        else {
            this.jsdom = await this.getHtmlPageAsync('main.html');
            return this.jsdom;
        }
    }

    private async getHtmlPageAsync(page: string) {
        if (this._origjsdom) {
            return new JSDOM(this._origjsdom.serialize());
        } else {
            let htmlPath = vscode.Uri.file(`${this.projectRoot.fsPath}/resources/${page}`);
            const htmlContent: string = await promisifier<string>(fs.readFile, htmlPath.fsPath, 'utf8');
            const replacedHTMLContent: string = htmlContent.replace(/\$\$ABS_PATH_TO_ROOT\$\$/g, this.projectRoot.fsPath);

            this._origjsdom = new JSDOM(replacedHTMLContent);
            return new JSDOM(replacedHTMLContent);
        }
    }


    public getTemplateCopy<T extends HTMLDivElement>(selector: string): T {
        const clone = this.jsdom.window.document.querySelector(selector).cloneNode(true) as T;
        return clone;
    }

    public getElementByIDThrows<T extends HTMLElement>(id: string): T {
        const el = this.jsdom.window.document.getElementById(id) as T;
        if (!el) {
            throw new Error(`getElementById failed on ${id}`);
        }
        return el;
    }

    public querySelectorThrows<T extends HTMLElement>(selector: string): T {
        const el = this.jsdom.window.document.querySelector(selector) as T;
        if (!el) {
            throw new Error(`getElementById failed on ${selector}`);
        }
        return el;
    }

    public createElement<T extends HTMLElement>(name: string): T {
        return this.jsdom.window.document.createElement(name) as T;
    }

    public createTextNode(txt: string): Text {
        return this.jsdom.window.document.createTextNode(txt);
    }

    public addClasses(el: HTMLElement, classesWhiteSpaceSeparated: string): void {
        classesWhiteSpaceSeparated.split(' ').forEach(cls => el.classList.add(cls));
    }

    public addScript(scriptName: string): void {
        const scriptEl = this.createElement('script');
        scriptEl.setAttribute('src', `file://${this.projectRoot.fsPath}/out/frontend/${scriptName}`);
        this.jsdom.window.document.body.appendChild(scriptEl);
    }

    public removeScript(scriptName: string): void {
        try {
            // querySelectorAll required because there are two body elements in the webview
            const scriptEls = this.jsdom.window.document.querySelectorAll(`body script[src$='${scriptName}']`);
            this.jsdom.window.document.body.removeChild(scriptEls[0]);
        } catch(e) {
            return undefined;
        }
    }
}