#!/bin/bash

# TODO:
# - Add code to change the name of a glob to the version name when we have a
#   method for recovering the Urbit hash for an arbitrary glob file in Unix.
#   > For glob (i.e. `(map path mime)`) `g`, this is: `(shaf %sham (jam g))`,
#     which is a "half sha-256" sum with an injected "%sham" salt of the
#     number represented by `g` as a path map.
#   > Since `map` and `jam` are used in this operation, an Urbit ship basically
#     needs to be leveraged in order to calculate this glob hash.

## Constants ##

RELEASE_HELP="usage: release [-h | --help] ([-t | --type] <prod|test|dbug>) <version> <globpath>
perform a versioned release using a particular glob

Flag arguments:
  -h, --help: show this help message
  -t, --type: release type; one of: prod* (public + final), test (public + interrim), dbug (local))"
RELEASE_VERSION_REGEX="([[:digit:]]+)\.([[:digit:]]+)\.([[:digit:]]+)"
RELEASE_TYPE_REGEX="((prod)|(test)|(dbug))"

## Helper Functions ##

## Arguments ##

while : ; do case ${1} in
	-h | --help) printf "%s\\n" "$RELEASE_HELP" && exit 1 ;;
	-t | --type) release_type=$2 && shift 2 ;;
	-*) printf "invalid option: %s\\n" "${1}" && exit 1 ;;
	*) break ;;
esac done

if [ "2" != "$#" ]; then
	printf "%s\\n" "$RELEASE_HELP" && exit 1
fi

[ -z "${release_type}" ] && release_type="prod"
if ! echo "${release_type}" | grep -qE "${RELEASE_TYPE_REGEX}"; then
	printf "invalid release type: %s\\n" "${release_type}" && exit 1
fi

release_version="${1}"
if ! echo "${release_version}" | grep -qE "${RELEASE_VERSION_REGEX}"; then
	printf "invalid version string: %s\\n" "${release_version}" && exit 1
fi
release__hoonver="${release_version//./ }"

release_globpath="${2}"
if [ ! -f "${release_globpath}" ]; then
	printf "bad glob file at path: %s\\n" "${release_globpath}" && exit 1
fi
release__hashfile="$(dirname "$(readlink -f "$0")")/.release-hashes.csv"
if [ ! -e "${release__hashfile}" ]; then
	echo "sha256,shaUrbit" >> "${release__hashfile}"
fi
if [ ! -f "${release__hashfile}" ]; then
	printf "bad release cache file at path: %s\\n" "${release__hashfile}" && exit 1
fi
release__globsha256="$(sha256sum "${release_globpath}" | awk '{print $1}')"
release__globshaurb="$(awk -F ',' -v sha="${release__globsha256}" '$1 == sha {print $2}' < "${release__hashfile}")"
if [ -z "${release__globshaurb}" ]; then
	release__globname="$(basename "$(readlink -f "${release_globpath}")")"
	if echo "${release__globname}" | grep -qE "^glob-(.*)\.glob$"; then
		release__globshaurb="$(echo "${release__globname}" | sed -re "s/^glob-(.*)\.glob$/\1/")"
		echo "${release__globsha256},${release__globshaurb}" >> "${release__hashfile}"
	else
		printf "couldn't find urbit hash for glob file: %s\\n" "${release_globpath}" && exit 1
	fi
fi

## Processing ##

release__basedir="$(dirname "$(dirname "$(dirname "$(readlink -f "$0")")")")"

release__vername=""
case ${release_type} in
	prod) release__vername="v${release_version}" ;;
	dbug) release__vername="v${release_version}-dbg" ;;
	test)
		release__latest="$(find "$(dirname "$(readlink -f "${release_globpath}")")" \
			-maxdepth 1 -name "v${release_version}-rc*.glob" \
			| sed -re "s/.*-rc([[:digit:]]+)\.glob/\1/" \
			| sort -g | tail -1)"
		release__vername="v${release_version}-rc$((release__latest+1))"
		;;
esac
release__filename="${release__vername}.glob"
mv "${release_globpath}" "$(dirname "$(readlink -f "${release_globpath}")")/${release__filename}"
if [ "${release_type}" = "prod" ]; then
	# shellcheck disable=SC2046,SC2086
	rm -f $(dirname "$(readlink -f "${release_globpath}")")/${release__vername}-rc*.glob
fi

release__reponame="$(git -C "${release__basedir}" remote -v | awk '/\(fetch\)$/ {print $2;}' | sed -re 's|.*:(.*)\.git$|\1|')"
release__repourl=""
case ${release_type} in
	dbug) release__repourl="http://127.0.0.1:8000/${release__filename}" ;;
	*) release__repourl="https://raw.githubusercontent.com/${release__reponame}/${release__vername}/meta/glob/${release__filename}" ;;
esac

# TODO: Verify that these commands succeeded and error out with a helpful
# message if they did not.
release__docket="${release__basedir}/desk/bare/desk.docket-0"
sed -r "s|([[:space:]]+glob-http\+\[).*(\].*)|\1\'${release__repourl}\' ${release__globshaurb}\2|" -i "${release__docket}"
sed -r "s|([[:space:]]+version\+\[).*(\].*)|\1${release__hoonver}\2|" -i "${release__docket}"

echo "deployed! run these follow commands to test:"
case ${release_type} in
	dbug) echo "cd ${release__basedir}/meta/glob && python3 -m http.server 8000" ;;
	*)
		echo "git -C ${release__basedir} add --all ."
		echo "git -C ${release__basedir} commit -m \"update to version ${release__vername}\""
		echo "git -C ${release__basedir} tag ${release__vername}"
		if [ "${release_type}" = "prod" ]; then
			echo "git -C ${release__basedir} tag -d ${release__vername}-rc*"
		fi
		echo "git -C ${release__basedir} push --tags origin HEAD"
		;;
esac
echo "durploy desk (test-ship) (test-desk) ${release__basedir}/desk/full/"
