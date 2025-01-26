//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

gRGBIndex = 0

var MapKit = {
addElementsToMapArray: function(destinationMap, key, elements) {
	if (destinationMap.has(key)) {
		Vector.pushArray(destinationMap.get(key), elements)
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
		MapKit.addElementsToMapArray(destinationMap, entry[0], entry[1])
	}
},

addToLinkMap: function(indexA, indexB, linkMap) {
	var top = Math.max(MapKit.getLinkTopOnly(indexA, linkMap), MapKit.getLinkTopOnly(indexB, linkMap))
	setLinkTop(indexA, linkMap, top)
	setLinkTop(indexB, linkMap, top)
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
	MapKit.setMapDefault(key, map, value)
	return [key, map]
},

getLinkTop: function(key, linkMap) {
	var top = MapKit.getLinkTopOnly(key, linkMap)
	setLinkTop(key, linkMap, top)
	return top
},

getLinkTopOnly: function(key, linkMap) {
	for (var keyIndex = 0; keyIndex < gLengthLimit; keyIndex++) {
		if (linkMap.has(key)) {
			key = linkMap.get(key)
		}
		else {
			return key
		}
	}

	warningByList(['In getLinkTopOnly keyIndex = 9876543', key, linkMap])
	return key
},

getMapArraysCopy: function(sourceMap) {
	var mapCopy = new Map()
	for (var entry of sourceMap.entries()) {
		mapCopy.set(entry[0], entry[1].slice(0))
	}

	return mapCopy
},

getMapBySkips: function(skips) {
	return new Map(MapKit.getEntriesBySkips(skips))
},

getMapByString: function(mapString) {
	return MapKit.getMapBySkips(mapString.split(' ').filter(lengthCheck))
},

getObjectBySkips: function(skips) {
	return Object.fromEntries(MapKit.getEntriesBySkips(skips))
},

getSorted: function(mapSource, compareFunction = Vector.compareStringAscending) {
	var keys = Array.from(mapSource.keys())
	keys.sort(compareFunction)
	var  sortedMap = new Map()
	for (var key of keys) {
		sortedMap.set(key, mapSource.get(key))
	}

	return sortedMap
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
	return MapKit.toStringByEntries(map.entries())
},

toStringByEntries: function(entries) {
	var mapStrings = []
	for (var entry of entries) {
		mapStrings.push(entry[0] + ':' + entry[1])
	}

	return '{' + mapStrings.join(', ') + '}'
}
}

var SetKit = {
addElementListsToSet: function(destinationSet, elementLists) {
	for (var elements of elementLists) {
		SetKit.addElementsToSet(destinationSet, elements)
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

getSorted: function(setSource, compareFunction = Vector.compareStringAscending) {
	var keys = Array.from(setSource.keys())
	keys.sort(compareFunction)
	return new Set(keys)
}

}

var Value = {
interpolationFromToAlong: function(from = 0.0, to = 1.0, along = 0.5) {
	return to * along + from * (1.0 - along)
},

floatByIDKey: function(registry, statement, id, key) {
	var statement = getStatementByID(registry, statement, id)
	return getFloatByKeyStatementValue(key, registry, statement, statement.attributeMap.get(key))
},

getBounded: function(value, lower, upper) {
	return Math.min(Math.max(value, lower), upper)
},

getBrightness256: function(brightness = 0.0) {
	return Math.floor(255.9 * ((brightness) % 1.0))
},

getPositiveModulo: function(x) {
	return x - Math.floor(x)
},

getRGB: function() {
	gRGBIndex += 1
	return Value.getRGBByIndex(gRGBIndex)
},

getRGBByIndex: function(rgbIndex) {
	return [Value.getBrightness256(rgbIndex * 0.617), Value.getBrightness256(rgbIndex * 0.733), Value.getBrightness256(rgbIndex * 0.317)]
},

getStep: function(value, step) {
	return Math.round(value / step) * step
},

getValueDefault: function(value, valueDefault) {
	if (value == undefined) {
		return valueDefault
	}

	return value
},

getValueNegativeDefault: function(value, valueDefault) {
	if (value < 0.0) {
		return valueDefault
	}

	return value
},

getValueRatio: function(value, valueNumerator, valueRatio) {
	if (value < 0.0) {
		return valueNumerator * valueRatio
	}

	return value
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
console.log('deprecated zoom')
	center = Vector.getArrayByElements(center, arrayLength)
	point = Vector.getArrayByElements(point, arrayLength)
	var centerPoint = VectorFast.getSubtractionArray(point, center, arrayLength)
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
