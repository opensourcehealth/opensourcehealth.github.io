//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gXYDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]]

function addLineToMap(line, lines, map, point) {
	if (map.has(line.beginKey)) {
		map.get(line.beginKey).lines.push(line)
	}
	else {
		map.set(line.beginKey, {point:point, lines:[line]})
	}
}

function addPixelLine(key, lines, pixelMap, pointMap, root, rotationIndex, tipMap, tips) {
	var endTipRotationIndex = rotationIndex
	var endTipDirectionIndex = gXYPlanar[endTipRotationIndex]
	var tipZero = tips[endTipDirectionIndex]
	if (tipZero == null) {
		return
	}
	var line = {beginKey:key + ',' + endTipDirectionIndex}
	var next = root.slice(0)
	pointMap.set(line.beginKey, tipZero)
	for (var endRotationIndex = rotationIndex + 5; endRotationIndex > rotationIndex + 1; endRotationIndex--) {
		var tipIndex = gXYPlanar[endRotationIndex % 4]
		if (tips != null) {
			var tipNext = tips[tipIndex]
			if (tipNext != null) {
				line.endKey = key + ',' + tipIndex
				line.endPoint = tipNext
				addLineToMap(line, lines, tipMap, tipZero)
				lines.push(line)
				reversedLine = {
					beginKey:line.endKey,
					beginPoint:line.endPoint,
					endKey:line.beginKey}
				addLineToMap(reversedLine, lines, tipMap, reversedLine.beginPoint)
				return
			}
		}
		addXY(next, gXYDirections[tipIndex])
		key = next.join(',')
		if (pixelMap.has(key)) {
			tips = pixelMap.get(key)
		}
		else {
			tips = null
		}
		endTipRotationIndex = (endTipRotationIndex + 3) % 4
		endTipDirectionIndex = planar[endTipRotationIndex]
	}
}

function addPixelLines(pixelMap, lines, pointMap, tipMap) {
	for (entry of pixelMap) {
		key = entry[0]
		parameters = key.split(',')
		root = [parseInt(parameters[0]), parseInt(parameters[1])]
		tips = entry[1]
		for (rotationIndex = 0; rotationIndex < 4; rotationIndex++) {
			addPixelLine(key, lines, pixelMap, pointMap, root, rotationIndex, tipMap, tips)
		}
	}
}

function addPixelRow(directionIndex, entry, pixelMap, signedIntersectionsMap) {
	var key = entry[0]
	var signedIntersections = entry[1]
	var y = parseInt(key)
	var keyBeside = (y + gXYDirections[directionIndex][1]).toString()
	if (signedIntersectionsMap.has(keyBeside)) {
		var signedIntersectionsAbove = signedIntersectionsMap.get(keyBeside)
		var signedIntersectionsInverted = []
		for (signedIntersection of signedIntersectionsAbove) {
			signedIntersectionsInverted.push([signedIntersection[0], -signedIntersection[1]])
		}
		signedIntersections = signedIntersections.concat(signedIntersectionsInverted)
	}
	signedIntersections.sort(compareSignedIntersectionAscending)
	var existence = 0
	var pixelStart = null
	for (signedIntersectionIndex = 0; signedIntersectionIndex < signedIntersections.length; signedIntersectionIndex++) {
		var signedIntersection = signedIntersections[signedIntersectionIndex]
		var existenceChange = signedIntersection[1]
		if (existenceChange < 0) {
			if (existence > 0) {
				for (pixelIndex = pixelStart; pixelIndex < signedIntersection[0]; pixelIndex++) {
					var pixelKey = pixelIndex + ',' + key
					if (!pixelMap.has(pixelKey)) {
						pixelMap.set(pixelKey, [null,null,null,null])
					}
					var root = [pixelIndex, y]
					pixelMap.get(pixelKey)[directionIndex] = root
				}
			}
		}
		else {
			pixelStart = signedIntersection[0]
		}
		existence += existenceChange
	}
}

function addPixels(pixelMap, signedIntersectionsMap) {
	for (entry of signedIntersectionsMap) {
		addPixelRow(2, entry, pixelMap, signedIntersectionsMap)
		addPixelRow(3, entry, pixelMap, signedIntersectionsMap)
	}
}

function addSpacel(key, signedIntersectionsMap) {
	var parameters = key.split(',');
	var intersectionKey = parameters.slice(1).join(',')
	var x = parseInt(parameters[0])
	addArrayElementToMap(x, intersectionKey, signedIntersectionsMap)
}

function addTestPixels(pixelMap) {
	pixelMap.set('8,0', [null,null,null,null]);
	pixelMap.set('8,1', [null,null,null,null]);
	pixelMap.set('8,2', [null,null,null,null]);
	pixelMap.set('9,0', [null,null,null,null])
	pixelMap.set('9,2', [null,null,null,null])
}

function createPixelTips(pixelMap) {
	for (entry of pixelMap) {
		parameters = entry[0].split(',')
		root = [parseInt(parameters[0]), parseInt(parameters[1])]
		distance = [0.3, 0.3]
		pixel = entry[1]
		for (rotationIndex = 0; rotationIndex < 4; rotationIndex++) {
			direction = gXYDirections[rotationIndex]
			if (!pixelMap.has(getXYAddition(root, direction).join(','))) {
				pixel[rotationIndex] = getXYAddition(root, getXYMultiplication(distance, direction))
			}
		}
	}
}

function existenceConditionOne(existence) {
	return existence == 1
}

function existenceConditionPositive(existence) {
	return existence > 0
}

function existenceConditionTwo(existence) {
	return existence == 2
}

function getIntersectionPairsByExistence(existenceCondition, signedIntersections) {
	var beginIntersection = null
	var currentExistenceCondition = false
	var existence = 0
	var intersectionPairs = []
	var lastExistenceCondition = false
	for (signedIntersectionIndex = 0; signedIntersectionIndex < signedIntersections.length; signedIntersectionIndex++) {
		var signedIntersection = signedIntersections[signedIntersectionIndex]
		var existenceChange = signedIntersection[1]
		existence += existenceChange
		currentExistenceCondition = existenceCondition(existence)
		if (currentExistenceCondition) {
			if (beginIntersection == null) {
				beginIntersection = signedIntersection[0]
			}
		}
		else {
			if (lastExistenceCondition) {
				var beginIndex = Math.round(Math.ceil(beginIntersection) + 0.001)
				var endIntersection = signedIntersection[0]
				var endIndex = Math.round(Math.floor(endIntersection) + 0.001)
				if (endIndex >= beginIndex) {
					var intersectionPair = {
						beginIndex:beginIndex,
						beginIntersection:beginIntersection,
						endIndex:endIndex,
						endIntersection:endIntersection}
					intersectionPairs.push(intersectionPair)
				}
				beginIntersection = null
			}
		}
		lastExistenceCondition = currentExistenceCondition
	}
	return intersectionPairs
}

function getPixel(key, pixelMap) {
	if (pixelMap.has(key)) {
		return pixelMap.get(key)
	}
	var pixel = [null,null,null,null]
	pixelMap.set(key, pixel)
	return pixel
}

function getPixelMapByLattice(intersectionPairsMap) {
	var pixelMap = new Map()
	for (entry of intersectionPairsMap) {
		var y = entry[0]
		for (intersectionPair of entry[1]) {
			var key = [intersectionPair.beginIndex, y]
			var position = [intersectionPair.beginIntersection, y]
			getPixel(key.join(','), pixelMap)[0] = position
			key[0] = intersectionPair.endIndex
			position = [intersectionPair.endIntersection, position[1]]
			getPixel(key.join(','), pixelMap)[1] = position
		}
	}
	return pixelMap
}

function getSignedIntersections(intersectionPairsA, intersectionPairsB, signB) {
	var totalIntersectionPairLength = 0
	if (intersectionPairsA != null) {
		totalIntersectionPairLength += intersectionPairsA.length
	}
	if (intersectionPairsB != null) {
		totalIntersectionPairLength += intersectionPairsB.length
	}
	var signedIntersections = new Array(totalIntersectionPairLength + totalIntersectionPairLength)
	var signedIntersectionIndex = 0
	if (intersectionPairsA != null) {
		for (intersectionPairA of intersectionPairsA) {
			signedIntersections[signedIntersectionIndex] = [intersectionPairA.beginIntersection, 1]
			signedIntersections[signedIntersectionIndex + 1] = [intersectionPairA.endIntersection, -1]
			signedIntersectionIndex += 2
		}
	}
	if (intersectionPairsB != null) {
		for (intersectionPairB of intersectionPairsB) {
			signedIntersections[signedIntersectionIndex] = [intersectionPairB.beginIntersection, signB]
			signedIntersections[signedIntersectionIndex + 1] = [intersectionPairB.endIntersection, -signB]
			signedIntersectionIndex += 2
		}
	}
	signedIntersections.sort(compareSignedIntersectionAscending)
	return signedIntersections
}

function getSignedIntersectionsMapBySpacelMap(exteriorMap) {
	var signedIntersectionsMap = new Map()
	for (entry of exteriorMap) {
		var key = entry[0]
		var exterior = entry[1]
		if (exterior[0] != null) {
			addSpacel(key, signedIntersectionsMap)
		}
		if (exterior[1] != null) {
			addSpacel(key, signedIntersectionsMap)
		}
	}
	for (entry of signedIntersectionsMap) {
		var intersections = entry[1]
		intersections.sort(compareNumberAscending)
		var intersectionDirections = []
		for (intersectionIndex = 0; intersectionIndex < intersections.length; intersectionIndex += 2) {
			var endIndex = intersectionIndex + 1
			if (endIndex < intersections.length) {
				intersections[intersectionIndex] = [intersections[intersectionIndex], 1]
				intersections[endIndex] = [intersections[endIndex] + 1, -1]
			}
			else {
				warningString = 'intersections length is odd:\n of the intersections:\n in getSignedIntersectionsMapBySpacelMap.'
				warning(warningString, [intersections.length, intersections])
			}
		}
	}
	return signedIntersectionsMap
}

function getXYLattice(xyPolygons) {
	var xyLattice = new Array(2)
	xyLattice[0] = getIntersectionPairsMap(xyPolygons)
	swapXY(xyPolygons)
	xyLattice[1] = getIntersectionPairsMap(xyPolygons)
	return xyLattice
}

function getXYLatticeAddition(xyLatticeA, xyLatticeB) {
	return getXYLatticeBoolean(existenceConditionPositive, 1, xyLatticeA, xyLatticeB)
}

function getXYLatticeBoolean(existenceCondition, signB, xyLatticeA, xyLatticeB) {
	var xyLatticeC = new Array(xyLatticeA.length)
	for (var intersectionPairsMapIndex = 0; intersectionPairsMapIndex < xyLatticeA.length; intersectionPairsMapIndex++) {
		var intersectionPairsMapA = xyLatticeA[intersectionPairsMapIndex]
		var intersectionPairsMapB = xyLatticeB[intersectionPairsMapIndex]
		var intersectionPairsMapC = new Map()
		xyLatticeC[intersectionPairsMapIndex] = intersectionPairsMapC
		var keySet = new Set()
		addElementsToSet(intersectionPairsMapA.keys(), keySet)
		addElementsToSet(intersectionPairsMapB.keys(), keySet)
		for (key of keySet) {
			var intersectionPairsA = null
			if (intersectionPairsMapA.has(key)) {
				intersectionPairsA = intersectionPairsMapA.get(key)
			}
			var intersectionPairsB = null
			if (intersectionPairsMapB.has(key)) {
				intersectionPairsB = intersectionPairsMapB.get(key)
			}
			var signedIntersections = getSignedIntersections(intersectionPairsA, intersectionPairsB, signB)
			intersectionPairsMapC.set(key, getIntersectionPairsByExistence(existenceCondition, signedIntersections))
		}
	}
	return xyLatticeC
}

function getXYLatticeExclusiveIntersection(xyLatticeA, xyLatticeB) {
	return getXYLatticeBoolean(existenceConditionOne, 1, xyLatticeA, xyLatticeB)
}

function getXYLatticeIntersection(xyLatticeA, xyLatticeB) {
	return getXYLatticeBoolean(existenceConditionTwo, 1, xyLatticeA, xyLatticeB)
}

function getXYLatticeSubtraction(xyLatticeA, xyLatticeB) {
	return getXYLatticeBoolean(existenceConditionPositive, -1, xyLatticeA, xyLatticeB)
}

function getXYPolygonsByLattice(xyLattice) {
	var lines = []
	var pointMap = new Map()
	var pixelMap = getPixelMapByLattice(xyLattice[0])
	var tipMap = new Map()
	var signedIntersectionsMap = getSignedIntersectionsMapBySpacelMap(pixelMap)
	addPixels(pixelMap, signedIntersectionsMap)
	positionPixelsByIntersectionPairsMap(xyLattice[1], pixelMap)
	addPixelLines(pixelMap, lines, pointMap, tipMap)
	return getPolygonsByLines(lines, pointMap)
}

function positionPixelsByIntersectionPairsMap(intersectionPairsMap, pixelMap) {
	for (entry of intersectionPairsMap) {
		var y = entry[0]
		for (intersectionPair of entry[1]) {
			var key = [y, intersectionPair.beginIndex]
			var position = [y, intersectionPair.beginIntersection]
			setPixelPosition(2, key, position, pixelMap)
			key[1] = intersectionPair.endIndex
			position = [position[0], intersectionPair.endIntersection]
			setPixelPosition(3, key, position, pixelMap)
		}
	}
}

function setPixelPosition(direction, key, position, pixelMap) {
	var keyString = key.join(',')
	if (pixelMap.has(keyString)) {
		var pixel = pixelMap.get(keyString)
		if (pixel[direction] != null) {
			pixel[direction] = position
		}
	}
}
