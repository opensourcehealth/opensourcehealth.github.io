//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addIntersectionsToSets(beginSet, endSet, intersections) {
	for (intersectionIndex = 0; intersectionIndex < intersections.length; intersectionIndex += 2) {
		endIntersectionIndex = intersectionIndex + 1
		if (endIntersectionIndex < intersections.length) {
			beginSet.add(intersections[intersectionIndex])
			endSet.add(intersections[endIntersectionIndex])
		}
		else {
			console.log('intersections length is odd: ' + intersections.length)
			console.log(intersections)
		}
	}
}

function addIntersectionsToTriple(xyBegin, xyEnd, tripleIntersection) {
	xyBeginY = xyBegin[1]
	xyEndY = xyEnd[1]
	if ((xyBeginY < y) && (xyEndY < y)) {
		return
	}
	if ((xyBeginY > y) && (xyEndY > y)) {
		return
	}
	if ((xyBeginY == y) && (xyEndY == y)) {
		tripleIntersection.centers.push(xyBegin[0])
		tripleIntersection.centers.push(xyEnd[0])
		return
	}
	if (xyBeginY == y) {
		if (xyEndY < y) {
			tripleIntersection.belows.push(xyBegin[0])
		}
		else {
			tripleIntersection.aboves.push(xyBegin[0])
		}
		return
	}
	if (xyEndY == y) {
		if (xyBeginY < y) {
			tripleIntersection.belows.push(xyEnd[0])
		}
		else {
			tripleIntersection.aboves.push(xyEnd[0])
		}
		return
	}
	deltaY = xyEndY - xyBeginY
	beginPortion = (xyEndY - y) / deltaY
	endPortion = (y - xyBeginY) / deltaY
	x = beginPortion * xyBegin[0] + endPortion * xyEnd[0]
	if ((xyBeginY < y) != (xyEndY < y)) {
		tripleIntersection.belows.push(x)
	}
	if ((xyBeginY > y) != (xyEndY > y)) {
		tripleIntersection.aboves.push(x)
	}
}

function convertPointStringsToPointLists(pointStrings) {
	for (stringIndex = 0; stringIndex < pointStrings.length; stringIndex++) {
		pointStrings[stringIndex] = getPointStringConvertedToPoints(pointStrings[stringIndex])
	}
	return pointStrings
}

function getClosedPolygonKey(beginIndex, polygonKey) {
	closedPolygon = []
	polygon = polygonKey.split(';')
	for (keyIndex = 0; keyIndex < polygon.length + 1; keyIndex++) {
		closedPolygon.push(polygon[(beginIndex + keyIndex) % polygon.length])
	}
	return closedPolygon.join(';')
}

function getClosestConnection(distances) {
	closestDistance = Number.MAX_VALUE
	closestFirstIndex = null
	closestOtherIndex = null
	closestPolygonIndex = null
	for (firstKeyIndex = 0; firstKeyIndex < distances.length; firstKeyIndex++) {
		polygons = distances[firstKeyIndex]
		for (polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
			otherPolygon = polygons[polygonIndex]
			for (otherKeyIndex = 0; otherKeyIndex < otherPolygon.length; otherKeyIndex++) {
				distance = otherPolygon[otherKeyIndex]
				if (distance != null) {
					if (distance < closestDistance) {
						closestDistance = distance
						closestFirstIndex = firstKeyIndex
						closestOtherIndex = otherKeyIndex
						closestPolygonIndex = polygonIndex
					}
				}
			}
		}
	}
	return [closestFirstIndex, closestOtherIndex, closestPolygonIndex + 1]
}

function getConnectedPolygonKey(pointMap, polygonKeys) {
	while (polygonKeys.length > 1) {
		distances = getPolygonDistances(pointMap, polygonKeys)
		connection = getClosestConnection(distances)
		firstPolygon = getClosedPolygonKey(connection[0], polygonKeys[0])
		polygonKeys[0] = firstPolygon + ';' + getClosedPolygonKey(connection[1], polygonKeys[connection[2]])
		polygonKeys.splice(connection[2], 1)
	}
	return polygonKeys[0]
}

function getIntersectionPairsMap(xyPolygons) {
	intersectionPairsMap = new Map()
	tripleIntersectionMap = new Map()
	for (xyPolygon of xyPolygons) {
		for (xyIndex = 0; xyIndex < xyPolygon.length; xyIndex++) {
			endIndex = (xyIndex + 1) % xyPolygon.length
			xyBegin = xyPolygon[xyIndex]
			xyEnd = xyPolygon[endIndex]
			beginY = xyBegin[1]
			endY = xyEnd[1]
			maximumY = Math.floor(Math.max(beginY, endY) + 1.001)
			minimumY = Math.ceil(Math.min(beginY, endY))
			for (y = minimumY; y < maximumY; y++) {
				tripleIntersection = null
				if (tripleIntersectionMap.has(y)) {
					tripleIntersection = tripleIntersectionMap.get(y)
				}
				else {
					tripleIntersection = {aboves:[], belows:[], centers:[]}
					tripleIntersectionMap.set(y, tripleIntersection)
				}
				addIntersectionsToTriple(xyBegin, xyEnd, tripleIntersection)
			}
		}
	}
	for (y of tripleIntersectionMap.keys()) {
		tripleIntersection = tripleIntersectionMap.get(y)
		tripleIntersection.aboves.sort(compareNumbers)
		tripleIntersection.belows.sort(compareNumbers)
		tripleIntersection.centers.sort(compareNumbers)
		beginSet = new Set()
		endSet = new Set()
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.aboves)
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.belows)
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.centers)
		beginIntersections = []
		for (intersection of beginSet) {
			beginIntersections.push(intersection)
		}
		beginIntersections.sort(compareNumbers)
		endIntersections = []
		for (intersection of endSet) {
			endIntersections.push(intersection)
		}
		endIntersections.sort(compareNumbers)
		intersectionPairs = []
		if (beginIntersections.length == endIntersections.length) {
			for (intersectionIndex = 0; intersectionIndex < beginIntersections.length; intersectionIndex += 2) {
				beginIntersection = beginIntersections[intersectionIndex]
				beginIndex = Math.round(Math.ceil(beginIntersection) + 0.1)
				endIntersection = endIntersections[intersectionIndex]
				endIndex = Math.floor(endIntersection)
				if (endIndex >= beginIndex) {
					intersectionPair = {
						beginIndex:beginIndex,
						beginIntersection:beginIntersection,
						endIndex:endIndex,
						endIntersection:endIntersection}
					intersectionPairs.push(intersectionPair)
				}
				else {
					console.log('endIndex < beginIndex, beginIndex: ' + beginIndex + '	endIndex: ' + endIndex)
					console.log('beginIntersection: ' + beginIntersection + '	endIntersection: ' + endIntersection)
					console.log('y: ' + y)
					console.log('tripleIntersection.belows: ' + tripleIntersection.belows)
					tripleIntersection.belows.sort(compareNumbers)
					console.log('tripleIntersection.belows: ' + tripleIntersection.belows)
				}
			}
		}
		else {
			console.log('beginIntersections.length: ' + beginIntersections.length + '   != endIntersections.length: endIntersections.length')
			console.log(intersections)
		}
		intersectionPairsMap.set(y, intersectionPairs)
	}
	return intersectionPairsMap
}

function getJoinedCoplanarPolygonKeys(pointMap, polygonKeys) {
	var arcMap = new Map()
	var lines = []
	var polygonKeyLinkMap = new Map()
//	uniquePolygonKeys = polygonKeys
	for (polygonKey of polygonKeys) {
		polygon = polygonKey.split(';')
		normalVector = getNormalVector(pointMap, polygonKey)
		for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			var key1 = polygon[(keyIndex + 1) % polygon.length]
			var key2 = polygon[(keyIndex + 2) % polygon.length]
			var arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length], normalVector, polygonKey]
			arcMap.set(key1 + ';' + key2, arc)
			lines.push(arc)
		}
	}
	for (arc of arcMap.values()) {
		if (arc != null) {
			reversedArcKey = arc[2] + ';' + arc[1]
			if (arcMap.has(reversedArcKey)) {
				reversedArc = arcMap.get(reversedArcKey)
				if (reversedArc != null) {
					if (getXYZLengthSquared(getXYZSubtraction(arc[4], reversedArc[4])) < 0.0001) {
						arcMap.get(arc[0] + ';' + arc[1])[3] = reversedArc[3]
						arcMap.get(arc[2] + ';' + arc[3])[0] = reversedArc[0]
						arcMap.get(reversedArc[0] + ';' + reversedArc[1])[3] = arc[3]
						arcMap.get(reversedArc[2] + ';' + reversedArc[3])[0] = arc[0]
						arcMap.set(arc[1] + ';' + arc[2], null)
						arcMap.set(reversedArcKey, null)
						arcPolygonKey = arc[5]
						do {
							if (reversedArc[5] == arcPolygonKey) {
								reversedArc = null
							}
							else {
								polygonKeyLinkMap.set(reversedArc[5], arcPolygonKey)
								reversedArc[5] = arcPolygonKey
								reversedArc = arcMap.get(reversedArc[2] + ';' + reversedArc[3])
							}
						}
						while (reversedArc != null);
					}
				}
				else {
					console.log('		  reversedArc = null			  reversedArc = null')
				}
			}
		}
	}
	joinedPolygonKeyMap = new Map()
	for (arc of arcMap.values()) {
		if (arc != null) {
			polygon = []
			polygonKeyHead = getPolygonKeyHead(arc[5], polygonKeyLinkMap)
			do {
				polygon.push(arc[1])
				arcMap.set(arc[1] + ';' + arc[2], null)
				arc = arcMap.get(arc[2] + ';' + arc[3])
			}
			while (arc != null);
			polygonKey = polygon.join(';')
			addArrayElementToMap(polygonKey, polygonKeyHead, joinedPolygonKeyMap)
		}
	}
	joinedPolygonKeys = []
	for (polygonKeys of joinedPolygonKeyMap.values()) {
		joinedPolygonKeys.push(getConnectedPolygonKey(pointMap, polygonKeys))
	}
	return joinedPolygonKeys
}

function getJoinedPolygonKeys(polygonKeys) {
	arcMap = new Map()
	for (polygonKey of polygonKeys) {
		polygon = polygonKey.split(';')
		for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			key1 = polygon[(keyIndex + 1) % polygon.length]
			key2 = polygon[(keyIndex + 2) % polygon.length]
			arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length]]
//			arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length], ' polygonKey ', polygonKey]
			arcMap.set(key1 + ';' + key2, arc)
		}
	}
	for (arc of arcMap.values()) {
		if (arc != null) {
			reversedArcKey = arc[2] + ';' + arc[1]
			if (arcMap.has(reversedArcKey)) {
				reversedArc = arcMap.get(reversedArcKey)
				if (reversedArc != null) {
					arcMap.get(arc[0] + ';' + arc[1])[3] = reversedArc[3]
					arcMap.get(arc[2] + ';' + arc[3])[0] = reversedArc[0]
					arcMap.get(reversedArc[0] + ';' + reversedArc[1])[3] = arc[3]
					arcMap.get(reversedArc[2] + ';' + reversedArc[3])[0] = arc[0]
					arcMap.set(arc[1] + ';' + arc[2], null)
					arcMap.set(reversedArcKey, null)
				}
			}
		}
	}
	joinedPolygonKeys = []
	for (arc of arcMap.values()) {
		if (arc != null) {
			polygon = []
			do {
				polygon.push(arc[1])
				arcMap.set(arc[1] + ';' + arc[2], null)
				arc = arcMap.get(arc[2] + ';' + arc[3])
			}
			while (arc != null);
			joinedPolygonKeys.push(polygon.join(';'))
		}
	}
	return joinedPolygonKeys
}

function getNormalVector(pointMap, polygonKey) {
	polygon = polygonKey.split(';')
	xyz = [0.0, 0.0, 0.0]
	divisor = 0.0
	for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		pointZero = pointMap.get(polygon[keyIndex])
		pointOne = pointMap.get(polygon[(keyIndex + 1) % polygon.length])
		pointTwo = pointMap.get(polygon[(keyIndex + 2) % polygon.length])
		vectorA = normalizeXYZ(getXYZSubtraction(pointOne, pointZero))
		vectorB = normalizeXYZ(getXYZSubtraction(pointTwo, pointZero))
		if (Math.abs(getDotProduct(vectorA, vectorB)) < 0.9999) {
			addXYZ(xyz, normalizeXYZ(getCrossProduct(vectorA, vectorB)))
			divisor += 1.0
		}
	}
	divideXYZByScalar(xyz, divisor)
	return xyz
}

function getPointStringConvertedToPoints(pointString) {
	var parameterStrings = pointString.split(' ')
	for (parameterIndex = 0; parameterIndex < parameterStrings.length; parameterIndex++) {
		parameterStrings[parameterIndex] = parameterStrings[parameterIndex].split(',').map(parseFloat)
	}
	return parameterStrings
}

function getPolygonDistances(pointMap, polygonKeys) {
	distances = []
	firstPolygon = polygonKeys[0].split(';')
	for (firstKeyIndex = 0; firstKeyIndex < firstPolygon.length; firstKeyIndex++) {
		firstPoint = pointMap.get(firstPolygon[firstKeyIndex])
		polygons = []
		for (polygonIndex = 1; polygonIndex < polygonKeys.length; polygonIndex++) {
			otherPolygon = polygonKeys[polygonIndex].split(';')
			polygon = []
			for (otherKeyIndex = 0; otherKeyIndex < otherPolygon.length; otherKeyIndex++) {
				otherPoint = pointMap.get(otherPolygon[otherKeyIndex])
				difference = getXYZSubtraction(firstPoint, otherPoint)
				polygon.push(getXYZLengthSquared(difference))
			}
			polygons.push(polygon)
		}
		distances.push(polygons)
	}
	return distances
}

function getPolygonKeyHead(polygonKey, polygonKeyLinkMap) {
	if (!polygonKeyLinkMap.has(polygonKey)) {
		return polygonKey
	}
	polygonKeys = [polygonKey]
	do {
		polygonKey = polygonKeyLinkMap.get(polygonKey)
		polygonKeys.push(polygonKey)
	}
	while (polygonKeyLinkMap.has(polygonKey));
	for (polygonKeyIndex = 0; polygonKeyIndex < polygonKeys.length - 1; polygonKeyIndex++) {
		polygonKeyLinkMap.set(polygonKeys[polygonKeyIndex], polygonKey)
	}
	return polygonKey
}

function getPolygonRotatedToBottom(polygon) {
	bottomIndex = 0
	minimumKey = polygon[0]
	for (keyIndex = 1; keyIndex < polygon.length; keyIndex++) {
		key = polygon[keyIndex]
		if (key < minimumKey) {
			minimumKey = key
			bottomIndex = keyIndex
		}
	}
	return polygon.slice(bottomIndex).concat(polygon.slice(0,bottomIndex))
}

function getXYZByXY(xyPolygons, z) {
	commaZString = ',' + z.toString()
	commaZStringSemicolon = commaZString + ';'
	polygonKeys = []
	for (polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		polygonKeys.push(xyPolygons[polygonIndex].join(commaZStringSemicolon) + commaZString)
	}
	return polygonKeys
}

function swapXY(xyPolygons) {
	for (xyPolygon of xyPolygons) {
		for (point of xyPolygon) {
			x = point[0]
			point[0] = point[1]
			point[1] = x
		}
	}
}
