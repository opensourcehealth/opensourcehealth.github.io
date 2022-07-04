//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addElementListsToSet(elementLists, setToAddTo) {
	for (var elements of elementLists) {
		addElementsToSet(elements, setToAddTo)
	}
}

function addElementToArrays(arrays, index, value) {
	if (arrays[index] == undefined) {
		arrays[index] = [value]
	}
	else {
		arrays[index].push(value)
	}
}

function addElementToMapArray(array, key, mapToAddTo) {
	if (mapToAddTo.has(key)) {
		mapToAddTo.get(key).push(array)
		return
	}
	mapToAddTo.set(key, [array])
}

function addElementsToSet(elements, setToAddTo) {
	for (var element of elements) {
		setToAddTo.add(element)
	}
}

function compareAbsoluteElementTwoAscending(a, b) {
	return Math.abs(a[2]) - Math.abs(b[2])
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
// in future rename to compareElementZero
	return a[0] - b[0]
}

function compareFirstElementDescending(a, b) {
	return b[0] - a[0]
}

function compareFirstThirdElementAscending(a, b) {
	if (a[0] == b[0]) {
		return a[2] - b[2]
	}
	return a[0] - b[0]
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

function copyMissingKeys(mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (!mapTo.has(key)) {
			mapTo.set(key, mapFrom.get(key))
		}
	}
}

function copyMissingKeysExcept(exceptionSet, mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (!exceptionSet.has(key)) {
			if (!mapTo.has(key)) {
				mapTo.set(key, mapFrom.get(key))
			}
		}
	}
}

function getArrayArraysCopy(arrayArrays) {
	var arrayArraysCopy = new Array(arrayArrays.length)
	for (var arraysIndex = 0; arraysIndex < arrayArrays.length; arraysIndex++) {
		arrayArraysCopy[arraysIndex] = getArraysCopy(arrayArrays[arraysIndex])
	}
	return arrayArraysCopy
}

function getArrayBySet(setForArray) {
	var array = new Array(setForArray.size)
	var index = 0
	for (var element of setForArray) {
		array[index] = element
		index += 1
	}
	return array
}

function getArrayOrNullBySet(setForArray) {
	if (setForArray.size == 0) {
		return null
	}
	return getArrayBySet(setForArray)
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

function getIsEmpty(array) {
	if (array == null || array == undefined) {
		return true
	}
	return array.length == 0
}

function getIsLong(array, minimumLength) {
	if (array == null || array == undefined) {
		return false
	}
	return array.length >= minimumLength
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

function getNullOrValue(key, map) {
	if (map.has(key)) {
		return map.get(key)
	}
	return null
}

function getShortArrays(length, points) {
	var shortArrays = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		shortArrays[pointIndex] = points[pointIndex].slice(0, length)
	}
	return shortArrays
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

function overwriteArray(elements, others) {
	elements.length = others.length
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[otherIndex] = others[otherIndex]
	}
	return elements
}

function pushArray(elements, others) {
	var elementsLength = elements.length
	var othersLength = others.length
	elements.length = elementsLength + othersLength
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[elementsLength] = others[otherIndex]
		elementsLength++
	}
	return elements
}

function removeNulls(elements) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] != null) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}
	elements.length = withoutNullLength
}

function removeNullsBySet(elements, nullIndexSet) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (!nullIndexSet.has(elementIndex)) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}
	elements.length = withoutNullLength
}

function removeRepeats(elements) {
	for (var elementIndex = elements.length - 1; elementIndex > -1; elementIndex--) {
		if (elements[elementIndex] == elements[(elementIndex + 1) % elements.length]) {
			elements.splice(elementIndex, 1)
		}
	}
}

function replaceElements(elements, find, replacement) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] == find) {
			elements[elementIndex] = replacement
		}
	}
}

function reverseArray(elements) {
	for (var element of elements) {
		element.reverse()
	}
}

function setArraysToArraysUntil(elements, others, until) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		for (var parameterIndex = 0; parameterIndex < until; parameterIndex++) {
			elements[elementIndex][parameterIndex] = others[elementIndex][parameterIndex]
		}
	}
}

function spliceArray(elements, index, others) {
	elements.length = elements.length + others.length
	elementsLengthMinus = elements.length - 1
	var fromIndex = elementsLengthMinus - others.length
	for (var toIndex = elementsLengthMinus; toIndex >= index; toIndex--) {
		elements[toIndex] = elements[fromIndex]
		fromIndex--
	}
	for (var otherIndex = 0; otherIndex < others.length; otherIndex++) {
		elements[index] = others[otherIndex]
		index++
	}
}
