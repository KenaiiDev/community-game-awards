import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;

// Nest 12 ships as ES modules only. A CommonJS package that require()s it only
// works where Node supports require(esm); Vercel's function loader does not, so
// the API crashes at boot with ERR_REQUIRE_ESM (see the deploy notes in README).
describe('production dependencies', () => {
  it('has no CommonJS package that depends on @nestjs/common', () => {
    const dependencies = Object.keys(readJson(path.join(root, 'package.json')).dependencies);
    const commonJsOnNest = dependencies.filter((name) => {
      const pkg = readJson(path.join(root, 'node_modules', name, 'package.json'));
      const onNest = Boolean(pkg.dependencies?.['@nestjs/common'] ?? pkg.peerDependencies?.['@nestjs/common']);
      return onNest && pkg.type !== 'module';
    });
    expect(commonJsOnNest).toEqual([]);
  });
});
