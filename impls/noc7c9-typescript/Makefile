STEPS = step0_repl

node_modules: package.json
	yarn install

build/step%.js: node_modules src/*.ts
	./node_modules/.bin/tsc -p ./
