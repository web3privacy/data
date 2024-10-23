all: test build

cache:
	deno cache utils/build.js

build:
	deno run --allow-all utils/build.js

sync:
	deno run --allow-all utils/sync.js

images:
	deno run --allow-all utils/images.js

img-opt:
	deno run --allow-all utils/img-opt.js

test:
	deno test --allow-all utils/test.js

fmt:
	deno fmt utils/*.js

refresh:
	deno run --allow-all utils/engine.js ; deno run --allow-all utils/images.js ; deno run --allow-all utils/thumbs-gen.js ; deno run --allow-all utils/test.js
