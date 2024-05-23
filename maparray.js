//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var arrayKit = {
addElementToArrays: function(arrays, index, value) {
	if (arrays[index] == undefined) {
		arrays[index] = [value]
	}
	else {
		arrays[index].push(value)
	}
},

arrayIsClose: function(elements, others) {
	if (elements.length != others.length) {
		return false
	}
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (Math.abs(elements[elementIndex] - others[elementIndex]) > gClose) {
			return false
		}
	}

	return true
},

compareAbsoluteElementTwoAscending: function(a, b) {
	return Math.abs(a[2]) - Math.abs(b[2])
},

compareArrayAscending: function(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return a[0][elementIndex] - b[0][elementIndex]
		}
	}

	return 0
},

compareArrayDescending: function(a, b) {
	var minimumLength = Math.min(a.length, b.length)
	for (var elementIndex = 0; elementIndex < minimumLength; elementIndex++) {
		if (a[0][elementIndex] != b[0][elementIndex]) {
			return b[0][elementIndex] - a[0][elementIndex]
		}
	}

	return 0
},

compareElementZeroAscending: function(a, b) {
	return a[0] - b[0]
},

compareElementZeroDescending: function(a, b) {
	return b[0] - a[0]
},

compareElementZeroOneDescending: function(a, b) {
	if (Math.abs(a[0] - b[0]) < gClose) {
		return b[1] - a[1]
	}

	return b[0] - a[0]
},

compareElementZeroTwoAscending: function(a, b) {
	if (Math.abs(a[0] - b[0]) < gClose) {
		return a[2] - b[2]
	}

	return a[0] - b[0]
},

compareIDAscending: function(a, b) {
	return a.id > b.id
},

compareNumberAscending: function(a, b) {
	return a - b
},

compareNumberDescending: function(a, b) {
	return b - a
},

compareSignedIntersectionAscending: function(a, b) {
	if (a[0] == b[0]) {
		return a[1] - b[1]
	}

	return a[0] - b[0]
},

compareStringZeroAscending: function(a, b) {
	return a[0] > b[0]
},

compareStringAscending: function(a, b) {
	return a > b
},

continueArrays: function(arrays, oldArray) {
	if (arrays.length < 1) {
		return arrays
	}

	if (oldArray == undefined) {
		oldArray = arrays[0]
	}

	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (!Array.isArray(arrays[arrayIndex])) {
			arrays[arrayIndex] = [arrays[arrayIndex]]
		}
		var array = arrays[arrayIndex]
		array.length = oldArray.length
		arrayKit.setUndefinedElementsToArray(array, oldArray)
		oldArray = array
	}

	return arrays
},

getAreArraysLong: function(arrays, minimumLength) {
	for (var array of arrays) {
		if (!arrayKit.getIsArrayLong(array, minimumLength)) {
			return false
		}
	}

	return true
},

getArrayArraysCopy: function(arrayArrays) {
	var arrayArraysCopy = new Array(arrayArrays.length)
	for (var arraysIndex = 0; arraysIndex < arrayArrays.length; arraysIndex++) {
		arrayArraysCopy[arraysIndex] = arrayKit.getArraysCopy(arrayArrays[arraysIndex])
	}

	return arrayArraysCopy
},

getArrayByElements: function(elements, until, value = 0.0) {
	var elements = arrayKit.getArrayByValue(elements)
	var until = Value.getValueDefault(until, elements.length)
	if (elements.length < until) {
		elements.length = until
	}

	for (var elementIndex = 0; elementIndex < until; elementIndex++) {
		elements[elementIndex] = Value.getValueDefault(elements[elementIndex], value)
	}

	return elements
},

getArrayByValue: function(value) {
	if (Array.isArray(value)) {
		return value
	}

	return [value]
},

getArrayOrUndefinedBySet: function(setForArray) {
	if (setForArray.size == 0) {
		return undefined
	}

	return Array.from(setForArray)
},

getArraysBySplittingStrings: function(strings, stringSeparator) {
	var arrays = new Array(strings.length)
	for (var stringIndex = 0; stringIndex < strings.length; stringIndex++) {
		arrays[stringIndex] = strings[stringIndex].split(stringSeparator)
	}

	return arrays
},

getArraysCopy: function(arrays) {
	var arraysCopy = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		arraysCopy[arrayIndex] = arrays[arrayIndex].slice(0)
	}

	return arraysCopy
},

getFilledArray: function(value, length = 2) {
	var array = new Array(length)
	for (var arrayIndex = 0; arrayIndex < length; arrayIndex++) {
		array[arrayIndex] = value
	}

	return array
},

getIsEmpty: function(array) {
	if (array == null || array == undefined) {
		return true
	}

	return array.length == 0
},

getIsArrayLong: function(array, minimumLength) {
	if (array == null || array == undefined) {
		return false
	}

	return array.length >= minimumLength
},

getNumberOfDifferences: function(arraysA, arraysB) {
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
},

getPushArray: function(elements, others) {
	if (elements == undefined) {
		return others
	}

	return arrayKit.pushArray(elements, others)
},

getPushElement: function(arrayToAddTo, element) {
	if (arrayToAddTo == undefined) {
		return [element]
	}

	arrayToAddTo.push(element)
	return arrayToAddTo
},

getSequence: function(length) {
	var sequence = new Array(length)
	for (var index = 0; index < length; index++) {
		sequence[index] = index
	}
	return sequence
},

getShortArrays: function(arrays, length) {
	var shortArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		shortArrays[arrayIndex] = arrays[arrayIndex].slice(0, length)
	}
	return shortArrays
},

getStartIndex: function(elements) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var nextIndex = (elementIndex + 1) % elements.length
		if (elements[elementIndex] == null && elements[nextIndex] != null) {
			return nextIndex
		}
	}

	return undefined
},

getStringByArrays: function(arrays) {
	var joinedArrays = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		joinedArrays[arrayIndex] = arrays[arrayIndex].join(',')
	}

	return joinedArrays.join(' ')
},

overwriteArray: function(elements, sources) {
	elements.length = sources.length
	for (var sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
},

overwriteArraysUntil: function(elementArrays, sourceArrays, until) {
	for (var sourceArrayIndex = 0; sourceArrayIndex < sourceArrays.length; sourceArrayIndex++) {
		this.overwriteArrayUntil(elementArrays[sourceArrayIndex], sourceArrays[sourceArrayIndex], until)
	}
},

overwriteArrayUntil: function(elements, sources, until) {
	for (var sourceIndex = 0; sourceIndex < until; sourceIndex++) {
		elements[sourceIndex] = sources[sourceIndex]
	}
},

pushArray: function(elements, others) {
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
},

removeLastEmpties: function(elements) {
	var lastIndex = elements.length - 1
	for (; lastIndex > -1; lastIndex--) {
		if (elements[lastIndex] != undefined && elements[lastIndex] != '') {
			elements.length = lastIndex + 1
			return
		}
	}

	elements.length = 0
},

removeRepeats: function(elements) {
	for (var elementIndex = elements.length - 1; elementIndex > -1; elementIndex--) {
		if (elements[elementIndex] == elements[(elementIndex + 1) % elements.length]) {
			elements.splice(elementIndex, 1)
		}
	}
},

removeRepeatsAdd: function(elements, others, minimumLength) {
	arrayKit.removeRepeats(others)
	if (others.length >= minimumLength) {
		elements.push(others)
	}
},

removeShortArrays: function(arrays, length) {
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		if (arrays[arrayIndex] != undefined) {
			if (arrays[arrayIndex].length < length) {
				arrays[arrayIndex] = undefined
			}
		}
	}

	arrayKit.removeUndefineds(arrays)
},

removeUndefineds: function(elements) {
	var withoutNullLength = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] != undefined) {
			elements[withoutNullLength] = elements[elementIndex]
			withoutNullLength += 1
		}
	}

	elements.length = withoutNullLength
},

replaceElements: function(elements, find, replacement) {
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		if (elements[elementIndex] == find) {
			elements[elementIndex] = replacement
		}
	}
},

replaceAllKeys: function(map, find, replacement) {
	for (var key of map.keys()) {
		map.set(key, map.get(key).replaceAll(find, replacement))
	}
},

reverseArrays: function(elements) {
	for (var element of elements) {
		element.reverse()
	}
},

setArraysLength: function(arrays, length) {
	for (var array of arrays) {
		array.length = length
	}
},

setUndefinedArraysToPrevious: function(arrays) {
	if (arrays.length == 0) {
		return
	}

	var oldElements = arrays[0]
	for (var arrayIndex = 1; arrayIndex < arrays.length; arrayIndex++) {
		var elements = arrays[arrayIndex]
		arrayKit.setUndefinedElementsToArray(elements, oldElements)
		oldElements = elements
	}
},

setUndefinedElementsToArray: function(elements, sources) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = Value.getValueDefault(elements[parameterIndex], sources[parameterIndex])
	}
},

setUndefinedElementsToArrayZero: function(elements, sources) {
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
},

setUndefinedElementsToValue: function(elements, value = 0.0) {
	for (var parameterIndex = 0; parameterIndex < elements.length; parameterIndex++) {
		elements[parameterIndex] = Value.getValueDefault(elements[parameterIndex], value)
	}
},

spliceArray: function(elements, index, others) {
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
}

var mapKit = {
addElementsToMapArray: function(destinationMap, key, elements) {
	if (destinationMap.has(key)) {
		arrayKit.pushArray(destinationMap.get(key), elements)
		return
	}

	destinationMap.set(key, elements)
},

addElementToMapArray: function(destinationMap, key, element) {
	if (destinationMap.has(key)) {
		destinationMap.get(key).push(element)
		return
	}

	destinationMap.set(key, [element])
},

addMapToMap: function(destinationMap, sourceMap) {
	for (var entry of sourceMap.entries()) {
		destinationMap.set(entry[0], entry[1])
	}
},

addMapToMapArray: function(destinationMap, sourceMap) {
	for (var entry of sourceMap.entries()) {
		mapKit.addElementsToMapArray(destinationMap, entry[0], entry[1])
	}
},

copyKeysExcept: function(destinationMap, sourceMap, exceptionSet) {
	for (var key of sourceMap.keys()) {
		if (!exceptionSet.has(key)) {
			destinationMap.set(key, sourceMap.get(key))
		}
	}
},

copyMissingKeys: function(destinationMap, sourceMap) {
	for (var key of sourceMap.keys()) {
		if (!destinationMap.has(key)) {
			destinationMap.set(key, sourceMap.get(key))
		}
	}
},

copyMissingKeysExcept: function(destinationMap, sourceMap, exceptionSet) {
	for (var key of sourceMap.keys()) {
		if (!exceptionSet.has(key)) {
			if (!destinationMap.has(key)) {
				destinationMap.set(key, sourceMap.get(key))
			}
		}
	}
},

deleteKeysExcept: function(map, exceptionSet) {
	for (var key of map.keys()) {
		if (!exceptionSet.has(key)) {
			map.delete(key)
		}
	}
},

getEntriesBySkips: function(skips) {
	var halfRoundedDown = Math.floor(skips.length / 2)
	var entries = new Array(halfRoundedDown)
	for (var entryIndex = 0; entryIndex < halfRoundedDown; entryIndex++) {
		var skipIndex = entryIndex + entryIndex
		entries[entryIndex] = [skips[skipIndex], skips[skipIndex + 1]]
	}

	return entries
},

getKeyMapDefault: function(key, map, value) {
	mapKit.setMapDefault(key, map, value)
	return [key, map]
},

getMapArraysCopy: function(sourceMap) {
	var mapCopy = new Map()
	for (var entry of sourceMap.entries()) {
		mapCopy.set(entry[0], entry[1].slice(0))
	}

	return mapCopy
},

getMapBySkips: function(skips) {
	return new Map(mapKit.getEntriesBySkips(skips))
},

getMapByString: function(mapString) {
	return mapKit.getMapBySkips(mapString.split(' ').filter(lengthCheck))
},

getObjectBySkips: function(skips) {
	return Object.fromEntries(mapKit.getEntriesBySkips(skips))
},

getUndefinedOrValue: function(map, key) {
	if (map.has(key)) {
		return map.get(key)
	}

	return undefined
},

removeCollectionElementsByIterable: function(collection, iterable) {
	for (var element of iterable) {
		collection.delete(element)
	}
},

setMapDefault: function(key, map, value) {
	if (!map.has(key)) {
		map.set(key, value)
	}
},

setMapIfDefined: function(key, map, value) {
	if (value != undefined) {
		map.set(key, value)
	}
},

toString: function(map) {
	return mapKit.toStringByEntries(map.entries())
},

toStringByEntries: function(entries) {
	var mapStrings = []
	for (var entry of entries) {
		mapStrings.push(entry[0] + ':' + entry[1])
	}

	return '{' + mapStrings.join(', ') + '}'
}
}

var setKit = {
addElementListsToSet: function(destinationSet, elementLists) {
	for (var elements of elementLists) {
		setKit.addElementsToSet(destinationSet, elements)
	}
},

addElementsToSet: function(destinationSet, elements) {
	for (var element of elements) {
		destinationSet.add(element)
	}
},

addRangeToSet: function(destinationSet, from, to) {
	for (var rangeIndex = from; rangeIndex < to; rangeIndex++) {
		destinationSet.add(rangeIndex)
	}
},

deleteElementsFromSet: function(setSource, elements) {
	for (var element of elements) {
		setSource.delete(element)
	}
},

getSorted: function(setSource, compareFunction = arrayKit.compareStringAscending) {
	var keys = Array.from(setSource.keys())
	keys.sort(compareFunction)
	return new Set(keys)
}

}

var Value = {
floatByIDKey: function(registry, statement, id, key) {
	var statement = getStatementByID(registry, statement, id)
	return getFloatByStatementValue(key, registry, statement, statement.attributeMap.get(key))
},

getBounded: function(value, lower, upper) {
	return Math.min(Math.max(value, lower), upper)
},

getStep: function(value, step) {
	return Math.round(value / step) * step
},

getValueNegativeDefault: function(value, valueDefault) {
	if (value < 0.0) {
		return valueDefault
	}

	return value
},

getValueDefault: function(value, valueDefault) {
	if (value == undefined) {
		return valueDefault
	}

	return value
},

getValueRatio: function(value, valueNumerator, valueRatio) {
	if (value < 0.0) {
		return valueNumerator * valueRatio
	}

	return Value.getValueNegativeDefault(value, valueDefault)
},

getValueFalse: function(value) {
	return Value.getValueDefault(value, false)
},

getValueTrue: function(value) {
	return Value.getValueDefault(value, true)
},

modifyObject_Private: function() {
	Value.floatByIDKey.optionMap = gMapRS2
	Value.setAttributeByID.optionMap = gMapRS2
	Value.stringLength.optionMap = gMapRS
},

setAttributeByID: function(registry, statement, id, key, value) {
	getStatementByID(registry, statement, id).attributeMap.set(key, value.toString())
	return value
},

stringLength: function(text) {
	return text.length
},

zoomInterpolation: function(x, polyline, point, center, arrayLength = 1) {
	center = arrayKit.getArrayByElements(center, arrayLength)
	point = arrayKit.getArrayByElements(point, arrayLength)
	var centerPoint = Vector.getSubtractionArray(point, center, arrayLength)
	var interpolationAlong = getFlatInterpolationAlongBeginEnd(x, polyline)
	var along = interpolationAlong[0]
	var oneMinus = 1.0 - along
	var lower = interpolationAlong[1]
	var upper = interpolationAlong[2]
	var minimumLength = Math.min(lower.length, upper.length)
	var interpolation = new Array(arrayLength).fill(0.0)
	for (var dimensionIndex = 1; dimensionIndex < minimumLength; dimensionIndex++) {
		var dimensionModulo = dimensionIndex % arrayLength
		var parameter = oneMinus * lower[dimensionIndex] + along * upper[dimensionIndex]
		interpolation[dimensionModulo] = centerPoint[dimensionModulo] * (parameter - 1.0)
	}
	return interpolation
},

zoomInterpolation2D: function(x, polyline, point, center) {
	return zoomInterpolation(x, polyline, point, center, 2)
},

zoomInterpolation3D: function(x, polyline, point, center) {
	return zoomInterpolation(x, polyline, point, center, 3)
}

}
