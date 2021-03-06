//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addArrayElementToMap(element, key, mapToAddTo) {
	if (mapToAddTo.has(key)) {
		mapToAddTo.get(key).push(element)
		return
	}
	mapToAddTo.set(key, [element])
}

function addElementsToSet(elements, setToAddTo) {
	for (var element of elements) {
		setToAddTo.add(element)
	}
}

function compareArrayAscending(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return a[0][elementIndex] - b[0][elementIndex]
		}
	}
	return 0
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

function compareFirstElementAscending(a, b) {
	return a[0] - b[0]
}

function compareFirstElementDescending(a, b) {
	return b[0] - a[0]
}

function compareIDAscending(a, b) {
	return a.id > b.id
}

function compareNumberAscending(a, b) {
	return a - b
}

function compareNumberDescending(a, b) {
	return b - a
}

function compareSignedIntersectionAscending(a, b) {
	if (a[0] == b[0]) {
		return a[1] - b[1]
	}
	return a[0] - b[0]
}

function getArrayArraysCopy(arrayArrays) {
	var arrayArraysCopy = new Array(arrayArrays.length)
	for (var arraysIndex = 0; arraysIndex < arrayArrays.length; arraysIndex++) {
		arrayArraysCopy[arraysIndex] = getArraysCopy(arrayArrays[arraysIndex])
	}
	return arrayArraysCopy
}

function getArraysBySplittingStrings(strings, stringSeparator) {
	var arrays = new Array(strings.length)
	for (var stringIndex = 0; stringIndex < strings.length; stringIndex++) {
		arrays[stringIndex] = strings[stringIndex].split(stringSeparator)
	}
	return arrays
}

function getArraysCopy(arrays) {
	var arraysCopy = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		arraysCopy[arrayIndex] = arrays[arrayIndex].slice(0)
	}
	return arraysCopy
}

function getArraysToString(arrays) {
	var arraysToString = []
	for (var array of arrays) {
		for (var element of array) {
			arraysToString.push(element.toString())
		}
	}
	return arraysToString
}

function getNumberOfDifferences(arraysA, arraysB) {
	var numberOfDifferences = 0
	if (arraysA.length != arraysB.length) {
		return Math.abs(arraysA.length - arraysB.length)
	}
	for (var arrayIndex = 0; arrayIndex < arraysA.length; arrayIndex++) {
		var arrayA = arraysA[arrayIndex]
		var arrayB = arraysB[arrayIndex]
		if (arrayA.length != arrayB.length) {
			numberOfDifferences += Math.abs(arrayA.length - arrayB.length)
		}
		else {
			for (var elementIndex = 0; elementIndex < arrayA.length; elementIndex++) {
				if (arrayA[elementIndex] != arrayB[elementIndex]) {
					numberOfDifferences += 1
				}
			}
		}
	}
	return numberOfDifferences
}

function getPushElement(arrayToAddTo, element) {
	if (arrayToAddTo == null) {
		return [element]
	}
	arrayToAddTo.push(element)
	return arrayToAddTo
}

function notNullCheck(element) {
	return element != null
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
