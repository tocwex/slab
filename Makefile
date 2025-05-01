BASE_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
BASE_NAME := $(shell basename $(BASE_DIR))

IN_SHIP ?= zod
# NOTE: Urbit-compliant name of project root directory
IN_DESK ?= $(shell echo $(BASE_NAME) | sed -e "s/[^a-z0-9]/-/g" -e "s/^[^a-z]/x/g")
IN_RVER ?= 0.0.0
IN_RTYP ?= dbug

OUT_DIR = $(BASE_DIR)/out
SRC_DIR = $(BASE_DIR)/src
GUI_DIR = $(BASE_DIR)/ui
DESK_DIR = $(OUT_DIR)/desk
EXEC_DIR = $(OUT_DIR)/exec
DIST_DIR = $(GUI_DIR)/dist
NODE_DIR = $(GUI_DIR)/node_modules
GLOB_DIR = $(OUT_DIR)/glob

DESK_FILES := $(shell find $(SRC_DIR) -type f)
GUI_FILES := $(shell find $(GUI_DIR)/src -type f) $(shell find $(GUI_DIR) -maxdepth 1 -type f)
PERU_FILE := $(BASE_DIR)/.peru/lastimports
LISC_FILE := $(BASE_DIR)/LICENSE.txt
ifeq (dbug,$(IN_RTYP))
	GLOB_FILE := $(GLOB_DIR)/v$(IN_RVER)-dbug.glob
else
	GLOB_FILE := $(GLOB_DIR)/v$(IN_RVER).glob
endif
GLUP := $(EXEC_DIR)/glup

define HELP_MESSAGE
usage: make {help|desk|glob|ship-desk|ship-glob|release}
generate build artifacts for an urbit ship (run 'durploy ship zod' first)

  make help : show this help message

  make desk : build the desk from dependencies
  make glob : build the front-end glob
  make ship-desk IN_SHIP=zod : build desk and deploy to ship 'zod'
  make ship-glob IN_SHIP=zod : build glob and deploy to 'zod'

  make release IN_SHIP=zod IN_RTYP=dbug IN_RVER=1.2.3 :
    ship desk/glob to 'zod' and perform 'dbug' release at verion '1.2.3'
    (see '$(GLUP) -h' for details)
endef
export HELP_MESSAGE


.PHONY : all help release ship-desk ship-glob desk glob tidy clean phony

all : desk glob

help :
	@echo "$$HELP_MESSAGE"


# FIXME: Clean this up; should be able to reuse deployment/sync commands.
# This is just ship-glob => release => ship-desk
release : $(GLOB_FILE)
$(GLOB_FILE) : ship-glob $(DESK_DIR) $(GLUP)
	$(GLUP) -t $(IN_RTYP) $(IN_RVER) "$$(ls -dtr1 $(GLOB_DIR)/* | tail -1)"
	cp -r $(SRC_DIR)/* $(DESK_DIR)
	touch $(DESK_DIR)
	durploy desk $(IN_SHIP) $(IN_DESK) $(DESK_DIR)/

# FIXME: This should be an alias for some sort of glob-(hash of ui/dist/) file
# so it doesn't always rebuild
ship-glob : $(DIST_DIR) $(GLOB_DIR)
	durploy desk -g $(IN_SHIP) $(IN_DESK) $(DIST_DIR)
	cp "$$(ls -dtr1 "$${XDG_CACHE_HOME:-$$HOME/.cache}/durploy/glob"/* | tail -1)" $(GLOB_DIR)
glob : $(DIST_DIR)
$(DIST_DIR) : $(GUI_FILES) $(NODE_DIR)
	cd $(GUI_DIR) && npm run build
	touch $(DIST_DIR)
$(NODE_DIR) : $(GUI_DIR)/package.json
	cd $(GUI_DIR) && npm install
	touch $(NODE_DIR)

ship-desk : $(DESK_DIR)
	durploy desk $(IN_SHIP) $(IN_DESK) $(DESK_DIR)/
desk : $(DESK_DIR)
$(DESK_DIR) : $(DESK_FILES) $(LISC_FILE) $(PERU_FILE) $(OUT_DIR)
	cp -r $(SRC_DIR)/* $(DESK_DIR)
	cp $(LISC_FILE) $(DESK_DIR)/license.txt
	touch $(DESK_DIR)

$(OUT_DIR) $(GLOB_DIR) $(EXEC_DIR) :
	mkdir -p $@

$(GLUP) : $(PERU_FILE)
$(PERU_FILE) : phony
	peru sync -v


phony :

tidy :
	rm -rf $(DESK_DIR) $(DIST_DIR)
clean :
	rm -rf $(DESK_DIR) $(DIST_DIR) $(EXEC_DIR) $(NODE_DIR)
