import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const hookInput = await new Promise((resolveInput) => {
	let serializedInput = '';
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', (chunk) => {
		serializedInput += chunk;
	});
	process.stdin.on('end', () => resolveInput(serializedInput));
});

let workingDirectory = process.cwd();

try {
	const parsedInput = JSON.parse(hookInput);
	if (typeof parsedInput.cwd === 'string') {
		workingDirectory = parsedInput.cwd;
	}
} catch {
	process.exit(0);
}

let repositoryRoot;
let markerPath;

try {
	repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
		cwd: workingDirectory,
		encoding: 'utf8',
	}).trim();
	const gitMarkerPath = execFileSync('git', ['rev-parse', '--git-path', 'agent-push-validation-failed'], {
		cwd: repositoryRoot,
		encoding: 'utf8',
	}).trim();
	markerPath = resolve(repositoryRoot, gitMarkerPath);
} catch {
	process.exit(0);
}

if (!existsSync(markerPath)) {
	process.exit(0);
}

const reason = 'The most recent git push was blocked because npm run verify:push did not pass. Continue working: inspect the failed validation output, fix the root cause without weakening tests, rerun npm run verify:push, and retry git push. Do not finish until the push succeeds and the failure marker is cleared.';

process.stdout.write(JSON.stringify({
	continue: true,
	decision: 'block',
	reason,
	systemMessage: 'Push validation is still failing. The agent must repair it before stopping.',
}));
