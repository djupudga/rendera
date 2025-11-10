clean:
	rm -rf dist

test:
	bun test

typecheck:
	bunx tsc

bundle: clean typecheck
	mkdir -p dist
	bun build ./index.ts --compile --target=bun-linux-x64 --outfile dist/rendera-linux-x64
	bun build ./index.ts --compile --target=bun-linux-arm64 --outfile dist/rendera-linux-arm64
	bun build ./index.ts --compile --target=bun-darwin-arm64 --outfile dist/rendera-darwin-arm64
	bun build ./index.ts --compile --target=bun-darwin-x64 --outfile dist/rendera-darwin-x64
	bun build ./index.ts --compile --target=bun-linux-x64-musl --outfile dist/rendera-linux-x64-musl

install: bundle
	cp -f dist/rendera-linux-x64 $(HOME)/.local/bin/rendera
