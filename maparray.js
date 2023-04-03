//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addElementListsToSet(elementLists, setTo) {
	for (var elements of elementLists) {
		addElementsToSet(elements, setTo)
	}
}

function addElementsToMapArray(elements, key, mapTo) {
	if (mapTo.has(key)) {
		pushArray(mapTo.get(key), elements)
		return
	}
	mapTo.set(key, elements)
}

function addElementsToSet(elements, setTo) {
	for (var element of elements) {
		setTo.add(element)
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

function addElementToMapArray(element, key, mapTo) {
	if (mapTo.has(key)) {
		mapTo.get(key).push(element)
		return
	}
	mapTo.set(key, [element])
}

function addMapToMapArray(mapFrom, mapTo) {
	for (var entry of mapFrom.entries()) {
		addElementsToMapArray(entry[1], entry[0], mapTo)
	}
}

function arrayIsClose(elements, others) {
	if (elements.length != others.length) {
		return false
	}
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (Math.abs(elements[elementIndex] - others[elementIndex]) > gClose) {
			return false
		}
	}
	return true
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
	if (Math.abs(a[0] - b[0]) < gClose) {
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

function copyKeysExcept(exceptionSet, mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (!exceptionSet.has(key)) {
			mapTo.set(key, mapFrom.get(key))
		}
	}
}

/*
deprecated23
function copySetKeys(copySet, mapFrom, mapTo) {
	for (var key of mapFrom.keys()) {
		if (copySet.has(key)) {
			mapTo.set(key, mapFrom.get(key))
		}
	}
}
*/

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

function deleteElementsFromSet(elements, setFrom) {
	for (var element of elements) {
		setFrom.delete(element)
	}
}

function deleteKeysExcept(exceptionSet, map) {
	for (var key of map.keys()) {
		if (!exceptionSet.has(key)) {
			map.delete(key)
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

function getArrayByElements(elements, until, value) {
	value = getValueByDefault(0.0, value)
	elements = getArrayByValue(elements)
	until = getValueByDefault(elements.length, until)
	if (elements.length < until) {
		elements.length = until
	}
	for (var elementIndex = 0; elementIndex < until; elementIndex++) {
		elements[elementIndex] = getValueByDefault(value, elements[elementIndex])
	}
	return elements
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

function getArrayByValue(value) {
	if (Array.isArray(value)) {
		return value
	}
	return [value]
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

function getMapArraysCopy(mapFrom) {
	var mapCopy = new Map()
	for (var entry of mapFrom.entries()) {
		mapCopy.set(entry[0], entry[1].slice(0))
	}
	return mapCopy
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

function getPushArray(elements, others) {
	if (elements == null) {
		return others
	}
	return pushArray(elements, others)
}

function getPushElement(arrayToAddTo, element) {
	if (arrayToAddTo == null) {
		return [element]
	}
	arrayToAddTo.push(element)
	return arrayToAddTo
}

function getSequence(length) {
	var sequence = new Array(length)
	for (var index = 0; index < length; index++) {
		sequence[index] = index
	}
	return sequence
}

function getShortArrays(length, points) {
	var shortArrays = new Array(points.length)
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		shortArrays[pointIndex] = points[pointIndex].slice(0, length)
	}
	return shortArrays
}

function getStartIndex(elements) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var nextIndex = (elementIndex + 1) % elements.length
		if (elements[elementIndex] == null && elements[nextIndex] != null) {
			return nextIndex
		}
	}
	return null
}

function getStringByArrays(arrays) {
	var joinedArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		joinedArrays[arrayIndex] = arrays[arrayIndex].join(',')
	}
	return joinedArrays.join(' ')
}

function getValueByDefault(defaultValue, value) {
	if (value == undefined) {
		return defaultValue
	}
	return value
}

function notNullCheck(element) {
	return element != null
}

function overwriteArray(elements, sources) {
	elements.length = sources.length
	for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
}

function overwriteArraysUntil(elementArrays, sourceArrays, until) {
	for (var sourceArrayIndex = 0; sourceArrayIndex < sourceArrays.length; sourceArrayIndex++) {
		overwriteArrayUntil(elementArrays[sourceArrayIndex], sourceArrays[sourceArrayIndex], until)
	}
}

function overwriteArrayUntil(elements, sources, until) {
	for (var sourceIndex = 0; sourceIndex < until; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
}

function pushArray(elements, others) {
	if (others == null || others == undefined) {
		return elements
	}
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

function removeCollectionElementsByIterable(collection, iterable) {
	for (var element of iterable) {
		collection.delete(element)
	}
}

function removeShortArrays(arrays, length) {
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (arrays[arrayIndex] != null) {
			if (arrays[arrayIndex].length < length) {
				arrays[arrayIndex] = null
			}
		}
	}
	removeNulls(arrays)
}

function replaceElements(elements, find, replacement) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] == find) {
			elements[elementIndex] = replacement
		}
	}
}

function reverseArrays(elements) {
	for (var element of elements) {
		element.reverse()
	}
}

function setMapIfMissing(key, map, value) {
	if (!map.has(key)) {
		map.set(key, value)
	}
}

//deprecated24
function setObjectAttribute(key, map, object, value) {
	if (map.has(key)) {
		value = map.get(key)(value)
	}
	return object[key] = value
}

function setUndefinedElementsToArray(elements, sources) {
	var minimumLength = Math.min(elements.length, sources.length)
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = getValueByDefault(sources[parameterIndex], elements[parameterIndex])
	}
}

function setUndefinedElementsToValue(elements, value) {
	value = getValueByDefault(0.0, value)
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = getValueByDefault(value, elements[parameterIndex])
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
