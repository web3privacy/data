all: test build

cache:
	deno cache utils/build.js

build:
	deno run --allow-all utils/build.js

test:
	deno test --allow-all utils/test.js

fmt:
	deno fmt utils/*.js