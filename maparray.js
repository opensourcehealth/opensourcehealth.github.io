//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addElementListsToSet(destinationSet, elementLists) {
	for (var elements of elementLists) {
		addElementsToSet(destinationSet, elements)
	}
}

function addElementsToMapArray(destinationMap, key, elements) {
	if (destinationMap.has(key)) {
		pushArray(destinationMap.get(key), elements)
		return
	}

	destinationMap.set(key, elements)
}

function addElementsToSet(destinationSet, elements) {
	for (var element of elements) {
		destinationSet.add(element)
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

function addElementToMapArray(destinationMap, key, element) {
	if (destinationMap.has(key)) {
		destinationMap.get(key).push(element)
		return
	}

	destinationMap.set(key, [element])
}

function addMapToMap(destinationMap, sourceMap) {
	for (var entry of sourceMap.entries()) {
		destinationMap.set(entry[0], entry[1])
	}
}

function addMapToMapArray(destinationMap, sourceMap) {
	for (var entry of sourceMap.entries()) {
		addElementsToMapArray(destinationMap, entry[0], entry[1])
	}
}

function addRangeToSet(destinationSet, from, to) {
	for (var rangeIndex = from; rangeIndex < to; rangeIndex++) {
		destinationSet.add(rangeIndex)
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

function compareStringZeroAscending(a, b) {
	return a[0] > b[0]
}

function copyKeysExcept(destinationMap, sourceMap, exceptionSet) {
	for (var key of sourceMap.keys()) {
		if (!exceptionSet.has(key)) {
			destinationMap.set(key, sourceMap.get(key))
		}
	}
}

function copyMissingKeys(destinationMap, sourceMap) {
	for (var key of sourceMap.keys()) {
		if (!destinationMap.has(key)) {
			destinationMap.set(key, sourceMap.get(key))
		}
	}
}

function copyMissingKeysExcept(destinationMap, sourceMap, exceptionSet) {
	for (var key of sourceMap.keys()) {
		if (!exceptionSet.has(key)) {
			if (!destinationMap.has(key)) {
				destinationMap.set(key, sourceMap.get(key))
			}
		}
	}
}

function deleteElementsFromSet(setSource, elements) {
	for (var element of elements) {
		setSource.delete(element)
	}
}

function deleteKeysExcept(map, exceptionSet) {
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
	value = getValueDefault(value, 0.0)
	elements = getArrayByValue(elements)
	until = getValueDefault(until, elements.length)
	if (elements.length < until) {
		elements.length = until
	}
	for (var elementIndex = 0; elementIndex < until; elementIndex++) {
		elements[elementIndex] = getValueDefault(elements[elementIndex], value)
	}

	return elements
}

function getArrayByValue(value) {
	if (Array.isArray(value)) {
		return value
	}

	return [value]
}

function getArrayOrUndefinedBySet(setForArray) {
	if (setForArray.size == 0) {
		return undefined
	}

	return Array.from(setForArray)
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

function getBoundedValue(value, lower, upper) {
	return Math.min(Math.max(value, lower), upper)
}

function getFilledArray(value, length = 2) {
	var array = new Array(length)
	for (var arrayIndex = 0; arrayIndex < length; arrayIndex++) {
		array[arrayIndex] = value
	}

	return array
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

function getKeyMapDefault(key, map, value) {
	setMapDefault(key, map, value)
	return [key, map]
}

function getMapArraysCopy(sourceMap) {
	var mapCopy = new Map()
	for (var entry of sourceMap.entries()) {
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

function getPushArray(elements, others) {
	if (elements == undefined) {
		return others
	}

	return pushArray(elements, others)
}

function getPushElement(arrayToAddTo, element) {
	if (arrayToAddTo == undefined) {
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

function getShortArrays(arrays, length) {
	var shortArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		shortArrays[arrayIndex] = arrays[arrayIndex].slice(0, length)
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

	return undefined
}

function getStringByArrays(arrays) {
	var joinedArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		joinedArrays[arrayIndex] = arrays[arrayIndex].join(',')
	}
	return joinedArrays.join(' ')
}

function getUndefinedOrValue(map, key) {
	if (map.has(key)) {
		return map.get(key)
	}

	return undefined
}

function getValueDefault(value, valueDefault) {
	if (value == undefined) {
		return valueDefault
	}

	return value
}

function getValueRatio(value, valueNumerator, valueRatio) {
	if (value < 0.0) {
		return valueNumerator * valueRatio
	}

	return value
}

function getValueFalse(value) {
	return getValueDefault(value, false)
}

function getValueTrue(value) {
	return getValueDefault(value, true)
}

function notUndefinedCheck(element) {
	return element != undefined
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
	if (others == undefined) {
		return elements
	}

	var elementsLength = elements.length
	var othersLength = others.length
	elements.length = elementsLength + othersLength
	for (var otherIndex = 0; otherIndex < othersLength; otherIndex++) {
		elements[elementsLength] = others[otherIndex]
		elementsLength++
	}

	return elements
}

function removeCollectionElementsByIterable(collection, iterable) {
	for (var element of iterable) {
		collection.delete(element)
	}
}

function removeLastEmpties(elements) {
	var lastIndex = elements.length - 1
	for (; lastIndex > -1; lastIndex--) {
		if (elements[lastIndex] != undefined && elements[lastIndex] != '') {
			elements.length = lastIndex + 1
			return
		}
	}

	elements.length = 0
}

function removeRepeats(elements) {
	for (var elementIndex = elements.length - 1; elementIndex > -1; elementIndex--) {
		if (elements[elementIndex] == elements[(elementIndex + 1) % elements.length]) {
			elements.splice(elementIndex, 1)
		}
	}
}

function removeRepeatsAdd(elements, others, minimumLength) {
	removeRepeats(others)
	if (others.length >= minimumLength) {
		elements.push(others)
	}
}

function removeShortArrays(arrays, length) {
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (arrays[arrayIndex] != undefined) {
			if (arrays[arrayIndex].length < length) {
				arrays[arrayIndex] = undefined
			}
		}
	}

	removeUndefineds(arrays)
}

function removeUndefineds(elements) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] != undefined) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}

	elements.length = withoutNullLength
}

function replaceAllKeys(map, find, replacement) {
	for (var key of map.keys()) {
		map.set(key, map.get(key).replaceAll(find, replacement))
	}
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

function setArraysLength(arrays, length) {
	for (var array of arrays) {
		array.length = length
	}
}

function setMapDefault(key, map, value) {
	if (!map.has(key)) {
		map.set(key, value)
	}
}

function setMapIfDefined(key, map, value) {
	if (value != undefined) {
		map.set(key, value)
	}
}

function setUndefinedArraysToPrevious(arrays) {
	if (arrays.length == 0) {
		return
	}

	var oldElements = arrays[0]
	for (var arrayIndex = 1; arrayIndex < arrays.length; arrayIndex++) {
		var elements = arrays[arrayIndex]
		setUndefinedElementsToArray(elements, oldElements)
		oldElements = elements
	}
}

function setUndefinedElementsToArray(elements, sources) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = getValueDefault(elements[parameterIndex], sources[parameterIndex])
	}
}

function setUndefinedElementsToArrayZero(elements, sources) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		if (elements[parameterIndex] == undefined) {
			if (sources.length > parameterIndex) {
				elements[parameterIndex] = sources[parameterIndex]
			}
			else {
				elements[parameterIndex] = 0.0
			}
		}
	}
}

function setUndefinedElementsToValue(elements, value = 0.0) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = getValueDefault(elements[parameterIndex], value)
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
