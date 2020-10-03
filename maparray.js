//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addArrayElementToMap(element, key, mapToAddTo) {
	if (mapToAddTo.has(key)) {
		mapToAddTo.get(key).push(element)
		return
	}
	mapToAddTo.set(key, [element])
}

function compareIntersections(a, b) {
	if (a[0] == b[0]) {
		return a[1] - b[1]
	}
	return a[0] - b[0]
}

function compareNumbers(a, b) {
	return a - b
}

function getListsCopy(lists) {
	listsCopy = lists.slice(0)
	for (var listIndex = 0; listIndex < listsCopy.length; listIndex++) {
		listsCopy[listIndex] = listsCopy[listIndex].slice(0)
	}
	return listsCopy
}
