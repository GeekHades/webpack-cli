import chalk from "chalk";
import * as path from "path";

import isLocalPath from "./is-local-path";
import modifyConfigHelper from "./modify-config-helper";
import { getPathToGlobalPackages } from "./package-manager";
import { spawnChild } from "./package-manager";

interface IChildProcess {
	status: number;
}

/**
 *
 * Attaches a promise to the installation of the package
 *
 * @param {Function} child - The function to attach a promise to
 * @returns {Promise} promise - Returns a promise to the installation
 */

export function processPromise(child: IChildProcess): Promise<any> {
	return new Promise((resolve: (_?: void) => void, reject: (_?: void) => void) => {
		if (child.status !== 0) {
			reject();
		} else {
			resolve();
		}
	});
}

/**
 *
 * Resolves and installs the packages, later sending them to @creator
 *
 * @param {String[]} pkg - The dependencies to be installed
 * @returns {Function|Error} creator - Builds
 * a webpack configuration through yeoman or throws an error
 */

export function resolvePackages(pkg: string[]): Function | void {
	Error.stackTraceLimit = 30;

	const packageLocations: string[] = [];

	function invokeGeneratorIfReady(): Function {
		if (packageLocations.length === pkg.length) {
			return modifyConfigHelper("init", null, null, packageLocations);
		}
	}

	pkg.forEach((addon: string) => {
		// Resolve paths to modules on local filesystem
		if (isLocalPath(addon)) {
			let absolutePath: string = addon;

			try {
				absolutePath = path.resolve(process.cwd(), addon);
				require.resolve(absolutePath);
				packageLocations.push(absolutePath);
			} catch (err) {
				console.error(`Cannot find a generator at ${absolutePath}.`);
				console.error("\nReason:\n");
				console.error(chalk.bold.red(err));
				process.exitCode = 1;
			}

			invokeGeneratorIfReady();
			return;
		}

		// Resolve modules on npm registry
		processPromise(spawnChild(addon))
			.then((_: void) => {
				try {
					const globalPath: string = getPathToGlobalPackages();
					packageLocations.push(path.resolve(globalPath, addon));
				} catch (err) {
					console.error("Package wasn't validated correctly..");
					console.error("Submit an issue for", pkg, "if this persists");
					console.error("\nReason: \n");
					console.error(chalk.bold.red(err));
					process.exitCode = 1;
				}
			})
			.catch((err: string) => {
				console.error("Package couldn't be installed, aborting..");
				console.error("\nReason: \n");
				console.error(chalk.bold.red(err));
				process.exitCode = 1;
			})
			.then(invokeGeneratorIfReady);
	});
}
