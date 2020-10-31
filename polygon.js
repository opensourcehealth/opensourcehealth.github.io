//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addIntersectionsToSets(beginSet, endSet, intersections) {
	for (intersectionIndex = 0; intersectionIndex < intersections.length; intersectionIndex += 2) {
		endIntersectionIndex = intersectionIndex + 1
		if (endIntersectionIndex < intersections.length) {
			beginSet.add(intersections[intersectionIndex])
			endSet.add(intersections[endIntersectionIndex])
		}
		else {
			warningByList(['In addIntersectionsToSets intersections length is odd:', intersections.length, intersections])
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

function addToMeetingMapByRotated(a, aX, b, bX, c, close, d, meetingMap) {
	if (aX == bX) {
		return null
	}
	if (aX > bX) {
		console.log('should never happen aX > bX:' + aX + '    bx:' + bX)
		console.log('c:' + c + '    d:' + d)
	}
	if ((c[0] < aX) && (d[0] < aX)) {
		return null
	}
	if ((c[0] > bX) && (d[0] > bX)) {
		return null
	}
	deltaY = d[1] - c[1]
	cPortion = d[1] / deltaY
	dPortion = 1.0 - cPortion
	xIntercept = cPortion * c[0] + dPortion * d[0]
	if (xIntercept < aX) {
		return cPortion
	}
	if (xIntercept > bX) {
		return cPortion
	}
	deltaX = bX - aX
	aPortion = (bX - xIntercept) / deltaX
	key = getEdgeKey(a.toString(), b.toString()) + '#' + getEdgeKey(c.toString(), d.toString())
	meeting = {aPortion:aPortion, cPortion:cPortion, exitPositive:(d[1] > 0.0), isIntersection:true}
	meetingMap.set(key, meeting)
	return cPortion
}

function addXYToList(list, xy) {
	for (value of list) {
		value[0] += xy[0]
		value[1] += xy[1]
	}
	return list
}

function addXYToLists(lists, xy) {
	for (list of lists) {
		addXYToList(list, xy)
	}
	return lists
}

function convertKeyStringsToPolygons(keyStrings) {
	for (var keyStringIndex = 0; keyStringIndex < keyStrings.length; keyStringIndex++) {
		keyStrings[keyStringIndex] = getPolygonByKeyString(keyStrings[keyStringIndex])
	}
	return keyStrings
}

function convertPointStringsToPointLists(pointStrings) {
	for (stringIndex = 0; stringIndex < pointStrings.length; stringIndex++) {
		pointStrings[stringIndex] = getPointStringConvertedToPoints(pointStrings[stringIndex])
	}
	return pointStrings
}

function convertPolygonKeyArraysToPolygons(polygonKeyArrays) {
	for (polygonKeyArray of polygonKeyArrays) {
		convertPolygonKeysToPolygon(polygonKeyArray)
	}
	return polygonKeyArrays
}

function convertPolygonKeysToPolygon(polygonKeys) {
	for (var polygonKeyIndex = 0; polygonKeyIndex < polygonKeys.length; polygonKeyIndex++) {
		polygonKeys[polygonKeyIndex] = polygonKeys[polygonKeyIndex].split(',').map(parseFloat)
	}
	return polygonKeys
}

function convertXYPolygonsToXYZ(xyPolygons, z) {
	for (polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		xyPolygons[polygonIndex] = getXYZPolygon(xyPolygons[polygonIndex], z)
	}
	return xyPolygons
}

function getClosedPolygonKeyString(beginIndex, polygonKeyString) {
	var polygon = polygonKeyString.split(' ')
	var polygonLengthPlus = polygon.length + 1
	var closedPolygon = new Array(polygonLengthPlus)
	for (keyIndex = 0; keyIndex < polygonLengthPlus; keyIndex++) {
		closedPolygon[keyIndex] = polygon[beginIndex % polygon.length]
		beginIndex += 1
	}
	return closedPolygon.join(' ')
}

function getClosedPolygon(beginIndex, polygon) {
	var polygonLengthPlus = polygon.length + 1
	var closedPolygon = new Array(polygonLengthPlus)
	for (keyIndex = 0; keyIndex < polygonLengthPlus; keyIndex++) {
		closedPolygon[keyIndex] = polygon[beginIndex % polygon.length].slice(0)
		beginIndex += 1
	}
	return closedPolygon
}

function getClosestConnection(distances) {
	closestDistance = Number.MAX_VALUE
	closestFirstKeyIndex = null
	closestOtherKeyIndex = null
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
						closestFirstKeyIndex = firstKeyIndex
						closestOtherKeyIndex = otherKeyIndex
						closestPolygonIndex = polygonIndex
					}
				}
			}
		}
	}
	return [closestFirstKeyIndex, closestOtherKeyIndex, closestPolygonIndex + 1]
}

function getConnectedPolygon(polygons) {
	while (polygons.length > 1) {
		var distanceArrays = getPolygonDistanceArrays(polygons)
		var connection = getClosestConnection(distanceArrays)
		var firstPolygon = getClosedPolygon(connection[0], polygons[0])
		polygons[0] = firstPolygon.concat(getClosedPolygon(connection[1], polygons[connection[2]]))
		polygons.splice(connection[2], 1)
	}
	return polygons[0]
}

function getConnectedPolygonKeyString(pointMap, polygonKeyStrings) {
	while (polygonKeyStrings.length > 1) {
		var distances = getPolygonDistancesByMap(pointMap, polygonKeyStrings)
		var connection = getClosestConnection(distances)
		var firstPolygon = getClosedPolygonKeyString(connection[0], polygonKeyStrings[0])
		polygonKeyStrings[0] = firstPolygon + ' ' + getClosedPolygonKeyString(connection[1], polygonKeyStrings[connection[2]])
		polygonKeyStrings.splice(connection[2], 1)
	}
	return polygonKeyStrings[0]
}

function getIntersectionPairsMap(xyPolygons) {
	var intersectionPairsMap = new Map()
	var tripleIntersectionMap = new Map()
	for (xyPolygon of xyPolygons) {
		for (xyIndex = 0; xyIndex < xyPolygon.length; xyIndex++) {
			var endIndex = (xyIndex + 1) % xyPolygon.length
			var xyBegin = xyPolygon[xyIndex]
			var xyEnd = xyPolygon[endIndex]
			var beginY = xyBegin[1]
			var endY = xyEnd[1]
			var maximumY = Math.floor(Math.max(beginY, endY) + 1.001)
			var minimumY = Math.ceil(Math.min(beginY, endY))
			for (y = minimumY; y < maximumY; y++) {
				var tripleIntersection = null
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
		var tripleIntersection = tripleIntersectionMap.get(y)
		tripleIntersection.aboves.sort(compareNumberAscending)
		tripleIntersection.belows.sort(compareNumberAscending)
		tripleIntersection.centers.sort(compareNumberAscending)
		var beginSet = new Set()
		var endSet = new Set()
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.aboves)
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.belows)
		addIntersectionsToSets(beginSet, endSet, tripleIntersection.centers)
		var beginIntersections = []
		for (intersection of beginSet) {
			beginIntersections.push(intersection)
		}
		beginIntersections.sort(compareNumberAscending)
		var endIntersections = []
		for (intersection of endSet) {
			endIntersections.push(intersection)
		}
		endIntersections.sort(compareNumberAscending)
		var intersectionPairs = []
		if (beginIntersections.length == endIntersections.length) {
			for (intersectionIndex = 0; intersectionIndex < beginIntersections.length; intersectionIndex++) {
				var beginIntersection = beginIntersections[intersectionIndex]
				var beginIndex = Math.round(Math.ceil(beginIntersection) + 0.001)
				var endIntersection = endIntersections[intersectionIndex]
				var endIndex = Math.floor(endIntersection)
				if (endIndex >= beginIndex) {
					var intersectionPair = {
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
					tripleIntersection.belows.sort(compareNumberAscending)
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
/*
function getIntersectionPortionsByRotated(aX, bX, c, close, d) {
	if (aX > bX) {
		console.log('should never happen aX > bX:' + aX + '    bx:' + bX)
		console.log('c:' + c + '    d:' + d)
	}
	if ((c[0] < aX) && (d[0] < aX)) {
		return null
	}
	if ((c[0] > bX) && (d[0] > bX)) {
		return null
	}
	var cIsClose = Math.abs(c[1]) < close
	var dIsClose = Math.abs(d[1]) < close
	if (cIsClose && dIsClose) {
		xIntercepts = [aX, bX, c[0], d[0]]
		xIntercepts.sort(compareNumberAscending)
		deltaX = d[0] - c[0]
		xIntercepts = xIntercepts.slice(1, 3)
		xIntercepts[0] = (d[0] - xIntercepts[0]) / deltaX
		xIntercepts[1] = (d[0] - xIntercepts[1]) / deltaX
		return xIntercepts
	}
	deltaY = d[1] - c[1]
	cPortion = d[1] / deltaY
	dPortion = 1.0 - cPortion
	xIntercept = cPortion * c[0] + dPortion * d[0]
//	console.log(xIntercept)
	return [cPortion]
}
*/
function getIntersectionPortions(a, b, c, d) {
	var meetingMap = new Map()
	deltaAB = getXYSubtraction(b, a)
	reverseRotation = [deltaAB[0], -deltaAB[1]]
	aT = getXYRotation(a, reverseRotation)
	bT = getXYRotation(b, reverseRotation)
	deltaX = bT[0] - aT[0]
	close = gClose * Math.sqrt(deltaX)
	cT = getXYRotation(c, reverseRotation)
	dT = getXYRotation(d, reverseRotation)
	cPortion = addToMeetingMapByRotated(a, aT[0], b, bT[0], cT, close, dT, meetingMap)
	return cPortion
}

function getJoinedCoplanarPolygonKeyStrings(pointMap, polygonKeyStrings) {
	var arcMap = new Map()
	var polygonKeyStringLinkMap = new Map()
	for (polygonKeyString of polygonKeyStrings) {
		polygon = polygonKeyString.split(' ')
		normalVector = getNormalVector(pointMap, polygonKeyString)
		for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			var key1 = polygon[(keyIndex + 1) % polygon.length]
			var key2 = polygon[(keyIndex + 2) % polygon.length]
			var arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length], normalVector, polygonKeyString]
			arcMap.set(key1 + ' ' + key2, arc)
		}
	}
	for (arc of arcMap.values()) {
		if (arc != null) {
			reversedArcKey = arc[2] + ' ' + arc[1]
			if (arcMap.has(reversedArcKey)) {
				reversedArc = arcMap.get(reversedArcKey)
				if (reversedArc != null) {
					if (getXYZLengthSquared(getXYZSubtraction(arc[4], reversedArc[4])) < 0.0001) {
						arcMap.get(arc[0] + ' ' + arc[1])[3] = reversedArc[3]
						arcMap.get(arc[2] + ' ' + arc[3])[0] = reversedArc[0]
						arcMap.get(reversedArc[0] + ' ' + reversedArc[1])[3] = arc[3]
						arcMap.get(reversedArc[2] + ' ' + reversedArc[3])[0] = arc[0]
						arcMap.set(arc[1] + ' ' + arc[2], null)
						arcMap.set(reversedArcKey, null)
						arcPolygonKeyString = arc[5]
						do {
							if (reversedArc[5] == arcPolygonKeyString) {
								reversedArc = null
							}
							else {
								polygonKeyStringLinkMap.set(reversedArc[5], arcPolygonKeyString)
								reversedArc[5] = arcPolygonKeyString
								reversedArc = arcMap.get(reversedArc[2] + ' ' + reversedArc[3])
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
	var joinedPolygonKeyStringMap = new Map()
	for (arc of arcMap.values()) {
		if (arc != null) {
			polygon = []
			polygonKeyStringHead = getPolygonKeyStringHead(arc[5], polygonKeyStringLinkMap)
			do {
				polygon.push(arc[1])
				arcMap.set(arc[1] + ' ' + arc[2], null)
				arc = arcMap.get(arc[2] + ' ' + arc[3])
			}
			while (arc != null);
			polygonKeyString = polygon.join(' ')
			addArrayElementToMap(polygonKeyString, polygonKeyStringHead, joinedPolygonKeyStringMap)
		}
	}
	var joinedPolygonKeyStrings = []
	for (polygonKeyStrings of joinedPolygonKeyStringMap.values()) {
		joinedPolygonKeyStrings.push(getConnectedPolygonKeyString(pointMap, polygonKeyStrings))
	}
	return joinedPolygonKeyStrings
}

function getJoinedMap(length, linkMap) {
	var joinedMap = new Map()
	for (var index = 0; index < length; index++) {
		var polygonKeyStringHead = getPolygonKeyStringHead(index, linkMap)
		addArrayElementToMap(index, polygonKeyStringHead, joinedMap)
	}
	return joinedMap
}

function getJoinedPolygonKeyArrays(polygonKeyArrays) {
	var arrowMap = new Map()
	for (polygonKeyArray of polygonKeyArrays) {
		for (keyIndex = 0; keyIndex < polygonKeyArray.length; keyIndex++) {
			var beginKey = polygonKeyArray[keyIndex]
			var endKey = polygonKeyArray[(keyIndex + 1) % polygonKeyArray.length]
			var shouldAddArrow = true
			if (arrowMap.has(endKey)) {
				otherArrows = arrowMap.get(endKey)
				for (var otherArrowIndex = otherArrows.length - 1; otherArrowIndex > -1; otherArrowIndex--) {
					var otherArrow = otherArrows[otherArrowIndex]
					if (beginKey == otherArrow.endKey && endKey == otherArrow.beginKey) {
						shouldAddArrow = false
						otherArrows.splice(otherArrowIndex, 1)
					}
				}
				if (otherArrows.length == 0) {
					arrowMap.delete(endKey)
				}
			}
			if (shouldAddArrow) {
				addArrayElementToMap({beginKey:beginKey, endKey:endKey}, beginKey, arrowMap)
			}
		}
	}
	for (key of arrowMap.keys()) {
		arrowMap.set(key, arrowMap.get(key)[0])
	}
	return getPolygonKeysByArrowMap(arrowMap)
}
/*
function getJoinedPolygonKeyStrings(polygonKeyStrings) {
	arcMap = new Map()
	for (polygonKeyString of polygonKeyStrings) {
		polygon = polygonKeyString.split(' ')
		for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			key1 = polygon[(keyIndex + 1) % polygon.length]
			key2 = polygon[(keyIndex + 2) % polygon.length]
			arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length]]
//			arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length], ' polygonKeyString ', polygonKeyString]
			arcMap.set(key1 + ' ' + key2, arc)
		}
	}
	for (arc of arcMap.values()) {
		if (arc != null) {
			reversedArcKey = arc[2] + ' ' + arc[1]
			if (arcMap.has(reversedArcKey)) {
				reversedArc = arcMap.get(reversedArcKey)
				if (reversedArc != null) {
					arcMap.get(arc[0] + ' ' + arc[1])[3] = reversedArc[3]
					arcMap.get(arc[2] + ' ' + arc[3])[0] = reversedArc[0]
					arcMap.get(reversedArc[0] + ' ' + reversedArc[1])[3] = arc[3]
					arcMap.get(reversedArc[2] + ' ' + reversedArc[3])[0] = arc[0]
					arcMap.set(arc[1] + ' ' + arc[2], null)
					arcMap.set(reversedArcKey, null)
				}
			}
		}
	}
	joinedPolygonKeyStrings = []
	for (arc of arcMap.values()) {
		if (arc != null) {
			polygon = []
			do {
				polygon.push(arc[1])
				arcMap.set(arc[1] + ' ' + arc[2], null)
				arc = arcMap.get(arc[2] + ' ' + arc[3])
			}
			while (arc != null);
			joinedPolygonKeyStrings.push(polygon.join(' '))
		}
	}
	return joinedPolygonKeyStrings
}
*/
function getNormalVectorBackup(pointMap, polygonKeyString) {
	polygon = polygonKeyString.split(' ')
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

function getNormalVector(pointMap, polygonKeyString) {
	var polygon = polygonKeyString.split(' ')
	var xyz = [0.0, 0.0, 0.0]
	var divisor = 0.0
	for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		var pointZero = pointMap.get(polygon[keyIndex])
		var pointOne = pointMap.get(polygon[(keyIndex + 1) % polygon.length])
		var pointTwo = pointMap.get(polygon[(keyIndex + 2) % polygon.length])
		var vectorA = getXYZSubtraction(pointOne, pointZero)
		var vectorB = getXYZSubtraction(pointTwo, pointZero)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		if (vectorALength != 0.0 && vectorBLength != 0.0) {
			divideXYZByScalar(vectorA, vectorALength)
			divideXYZByScalar(vectorB, vectorBLength)
			if (Math.abs(getDotProduct(vectorA, vectorB)) < 0.9999) {
				addXYZ(xyz, normalizeXYZ(getCrossProduct(vectorA, vectorB)))
				divisor += 1.0
			}
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

function getPolygonByKeyString(keyString) {
	var polygon = keyString.split(' ')
	for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		polygon[keyIndex] = polygon[keyIndex].split(',').map(parseFloat)
	}
	return polygon
}

function getPolygonDistanceArrays(polygons) {
	var firstPolygon = polygons[0]
	var distanceArrays = new Array(firstPolygon.length)
	for (firstKeyIndex = 0; firstKeyIndex < firstPolygon.length; firstKeyIndex++) {
		var firstPoint = firstPolygon[firstKeyIndex]
		var polygonLengthMinus = polygons.length - 1
		var polygonDistances = new Array(polygonLengthMinus)
		var otherPolygonIndex = 1
		for (polygonIndex = 0; polygonIndex < polygonLengthMinus; polygonIndex++) {
			var otherPolygon = polygons[otherPolygonIndex]
			var polygonDistance = new Array(otherPolygon.length)
			for (otherKeyIndex = 0; otherKeyIndex < otherPolygon.length; otherKeyIndex++) {
				polygonDistance[otherKeyIndex] = getXYZLengthSquared(getXYZSubtraction(firstPoint, otherPolygon[otherKeyIndex]))
			}
			polygonDistances[polygonIndex] = polygonDistance
			otherPolygonIndex += 1
		}
		distanceArrays[firstKeyIndex] = polygonDistances
	}
	return distanceArrays
}

function getPolygonDistancesByMap(pointMap, polygonKeyStrings) {
	firstPolygon = polygonKeyStrings[0].split(' ')
	var distances = new Array(firstPolygon.length)
	for (firstKeyIndex = 0; firstKeyIndex < firstPolygon.length; firstKeyIndex++) {
		firstPoint = pointMap.get(firstPolygon[firstKeyIndex])
		polygons = []
		for (polygonIndex = 1; polygonIndex < polygonKeyStrings.length; polygonIndex++) {
			var otherPolygon = polygonKeyStrings[polygonIndex].split(' ')
			var polygon = new Array(otherPolygon.length)
			for (otherKeyIndex = 0; otherKeyIndex < otherPolygon.length; otherKeyIndex++) {
				otherPoint = pointMap.get(otherPolygon[otherKeyIndex])
				difference = getXYZSubtraction(firstPoint, otherPoint)
				polygon[otherKeyIndex] = getXYZLengthSquared(difference)
			}
			polygons.push(polygon)
		}
		distances[firstKeyIndex] = polygons
	}
	return distances
}

function getPolygonKeysByArrowMap(arrowMap) {
	var polygonKeys = []
	for (arrow of arrowMap.values()) {
		if (arrow != null) {
			var keys = [arrow.beginKey]
			arrowMap.set(arrow.beginKey, null)
			do {
				if (arrowMap.has(arrow.endKey)) {
					var nextArrow = arrowMap.get(arrow.endKey)
					if (nextArrow == null) {
						warningString = 'In getPolygonsByLines, arrow.endKey:\n was null in the arrowMap:\n from the polygonKeyString:\n'
						warning(warningString, [arrow, arrowMap, keys])
						break
					}
					else {
						arrow = nextArrow
						arrowMap.set(arrow.beginKey, null)
						keys.push(arrow.beginKey)
					}
				}
				else {
					warningString = 'In getPolygonsByLines, arrow.endKey:\n was not in the arrowMap:\n from the polygonKeyString:\n'
					warning(warningString, [arrow, arrowMap, keys])
					break
				}
				if (keys[0] == arrow.endKey) {
					polygonKeys.push(keys)
					break
				}
				if (keys.length > 9876543) {
					warningString = 'In getPolygonsByLines, polygon is too large or there is a mistake, length: \narrowKey: \nkeys: '
					warning(warningString, [keys.length, arrow, keys])
					break
				}
			}
			while (true)
		}
	}
	return polygonKeys
}

function getPolygonKeyStringHead(polygonKeyString, polygonKeyStringLinkMap) {
	if (!polygonKeyStringLinkMap.has(polygonKeyString)) {
		return polygonKeyString
	}
	polygonKeyStrings = [polygonKeyString]
	do {
		polygonKeyString = polygonKeyStringLinkMap.get(polygonKeyString)
		polygonKeyStrings.push(polygonKeyString)
	}
	while (polygonKeyStringLinkMap.has(polygonKeyString));
	for (polygonKeyStringIndex = 0; polygonKeyStringIndex < polygonKeyStrings.length - 1; polygonKeyStringIndex++) {
		polygonKeyStringLinkMap.set(polygonKeyStrings[polygonKeyStringIndex], polygonKeyString)
	}
	return polygonKeyString
}

function getPolygonRotatedToBottom(polygon) {
	if (polygon.length == 0) {
		return polygon
	}
	var bottomIndex = 0
	var minimumKey = polygon[0]
	for (keyIndex = 1; keyIndex < polygon.length; keyIndex++) {
		var key = polygon[keyIndex]
		if (key < minimumKey) {
			minimumKey = key
			bottomIndex = keyIndex
		}
	}
	return polygon.slice(bottomIndex).concat(polygon.slice(0,bottomIndex))
}

function getPolygonsByArrowMap(arrowMap, pointMap) {
	var polygons = getPolygonKeysByArrowMap(arrowMap)
	for (polygon of polygons) {
		for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			polygon[keyIndex] = pointMap.get(polygon[keyIndex] )
		}
	}
	return polygons
}

function getPolygonsByLines(lines, pointMap) {
	var arrowMap = new Map()
	for (line of lines) {
		arrowMap.set(line.beginKey, line)
	}
	return getPolygonsByArrowMap(arrowMap, pointMap)
}

function getXYZPolygon(xyPolygon, z) {
	var xyzPolygon = new Array(xyPolygon.length)
	for (var pointIndex = 0; pointIndex < xyPolygon.length; pointIndex++) {
		var xy = xyPolygon[pointIndex]
		xyzPolygon[pointIndex] = [xy[0], xy[1], z]
	}
	return xyzPolygon
}

function getXYZPolygonKeyStrings(xyPolygons, z) {
	commaZString = ',' + z.toString()
	commaZStringSemicolon = commaZString + ' '
	var polygonKeyStrings = new Array(xyPolygons.length)
	for (polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		polygonKeyStrings[polygonIndex] = xyPolygons[polygonIndex].join(commaZStringSemicolon) + commaZString
	}
	return polygonKeyStrings
}

function getXYZPolygonKeyStringsByKeyStrings(xyPolygonKeyStrings, z) {
	commaZString = ',' + z.toString()
	commaZStringSemicolon = commaZString + ' '
	var polygonKeyStrings = new Array(xyPolygonKeyStrings.length)
	for (polygonIndex = 0; polygonIndex < xyPolygonKeyStrings.length; polygonIndex++) {
		polygonKeyStrings[polygonIndex] = xyPolygonKeyStrings[polygonIndex].split(' ').join(commaZStringSemicolon) + commaZString
	}
	return polygonKeyStrings
}

function rotateXYZParametersByPointList(rotation, pointList) {
	for (point of pointList) {
		var original0 = point[0]
		var rotationPlus3 = rotation + 3
		var indexFrom0 = rotationPlus3 % 3
		point[0] = point[indexFrom0]
		var indexFromIndexFrom0 = (rotationPlus3 + indexFrom0) % 3
		point[indexFrom0] = point[indexFromIndexFrom0]
		point[indexFromIndexFrom0] = original0
	}
}

function rotateXYZParametersByPointLists(rotation, pointLists) {
	for (pointList of pointLists) {
		rotateXYZParametersByPointList(rotation, pointList)
	}
}

function swapXY(xyPolygons) {
	for (xyPolygon of xyPolygons) {
		for (point of xyPolygon) {
			var x = point[0]
			point[0] = point[1]
			point[1] = x
		}
	}
}
