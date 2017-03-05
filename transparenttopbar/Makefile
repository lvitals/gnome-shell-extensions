# Install directory
EXT_DIR=$(HOME)/.local/share/gnome-shell/extensions
EXT_NAME=transparenttopbar@leavitals.gmail.com

.PHONY: build clean install uninstall fetch-updates update default

build:
	mkdir -vp build
	cp -vr stylesheet.css extension.js metadata.json build
	#glib-compile-schemas build/schemas

clean:
	rm -vrf build

install: build
	mkdir -vp $(EXT_DIR)/$(EXT_NAME)
	cp -vr ${PWD}/build/* $(EXT_DIR)/$(EXT_NAME)

uninstall:
	rm -vrf $(EXT_DIR)/$(EXT_NAME)

fetch-updates:
	git reset --hard HEAD
	git pull --rebase --prune

update: uninstall clean fetch-updates install

default: build
