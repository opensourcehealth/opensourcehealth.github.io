//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addArrayElementToMap(element, key, mapToAddTo) {
	if (mapToAddTo.has(key)) {
		mapToAddTo.get(key).push(element)
		return
	}
	mapToAddTo.set(key, [element])
}

function addElementsToSet(elements, setToAddTo) {
	for (element of elements) {
		setToAddTo.add(element)
	}
}

function compareArrayDescending(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return b[0][elementIndex] - a[0][elementIndex]
		}
	}
	return 0
}

function compareIntersections(a, b) {
	if (a[0] == b[0]) {
		return a[1] - b[1]
	}
	return a[0] - b[0]
}

function compareNumberDescending(a, b) {
	return b - a
}

function compareNumbers(a, b) {
	return a - b
}

function getArraysCopy(arrays) {
	arraysCopy = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		arraysCopy[arrayIndex] = arrays[arrayIndex].slice(0)
	}
	return arraysCopy
}

function pushArray(elements, others) {
	var elementsLength = elements.length
	var othersLength = others.length
	elements.length = elementsLength + othersLength
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[elementsLength] = others[otherIndex]
		elementsLength++
	}
}
