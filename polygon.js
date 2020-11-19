//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addInsideConnectedFacets(endFacets, facets, points) {
	var linkMap = new Map()
	var xyPolygons = getPolygonsByFacets(endFacets, points)
	for (var polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		var maximumXIntersections = []
		var xyPolygon = xyPolygons[polygonIndex]
		for (var otherIndex = 0; otherIndex < xyPolygons.length; otherIndex++) {
			if (polygonIndex != otherIndex) {
				var xyOtherPolygon = xyPolygons[otherIndex]
				var maximumXIntersection = getMaximumXIntersectionByPolygon(xyPolygon[0], xyOtherPolygon)
				if (maximumXIntersection != null) {
					maximumXIntersections.push([maximumXIntersection, otherIndex])
				}
			}
		}
		var otherIndexSet = new Set()
		for (var maximumXIntersection of maximumXIntersections) {
			otherIndexSet.add(maximumXIntersection[1])
		}
		maximumXIntersections.sort(compareFirstElementDescending)
		if (otherIndexSet.size % 2 == 1) {
			addToLinkMap(polygonIndex, maximumXIntersections[0][1], linkMap)
		}
	}
	var joinedMap = getJoinedMap(xyPolygons.length, linkMap)
	for (var joined of joinedMap.values()) {
		var joinedFacets = []
		for (var joinedIndex of joined) {
			joinedFacets.push(endFacets[joinedIndex])
		}
		facets.push(getConnectedFacet(joinedFacets, points))
	}
}

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

function addIntersectionsToTriple(xyBegin, xyEnd, tripleIntersection, y) {
	var xyBeginY = xyBegin[1]
	var xyEndY = xyEnd[1]
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
	var deltaY = xyEndY - xyBeginY
	var beginPortion = (xyEndY - y) / deltaY
	var endPortion = (y - xyBeginY) / deltaY
	var x = beginPortion * xyBegin[0] + endPortion * xyEnd[0]
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

function convertFacetsToPolygons(facets) {
	for (var facet of facets) {
		convertFacetsToPolygon(facet)
	}
	return facets
}

function convertFacetsToPolygon(facets) {
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		facets[facetIndex] = facets[facetIndex].split(',').map(parseFloat)
	}
	return facets
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

function convertXYPolygonsToXYZ(xyPolygons, z) {
	for (polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		xyPolygons[polygonIndex] = getXYZPolygon(xyPolygons[polygonIndex], z)
	}
	return xyPolygons
}

function getClosedFacet(beginIndex, facet) {
	var facetLengthPlus = facet.length + 1
	var closedFacet = new Array(facetLengthPlus)
	for (keyIndex = 0; keyIndex < facetLengthPlus; keyIndex++) {
		closedFacet[keyIndex] = facet[beginIndex % facet.length]
		beginIndex += 1
	}
	return closedFacet
}
/*
function getClosedPolygon(beginIndex, polygon) {
	var polygonLengthPlus = polygon.length + 1
	var closedPolygon = new Array(polygonLengthPlus)
	for (keyIndex = 0; keyIndex < polygonLengthPlus; keyIndex++) {
		closedPolygon[keyIndex] = polygon[beginIndex % polygon.length]
		beginIndex += 1
	}
	return closedPolygon
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
*/
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
	return {firstKeyIndex:closestFirstKeyIndex, otherKeyIndex:closestOtherKeyIndex, polygonIndexPlus:closestPolygonIndex + 1}
}

function getConnectedFacet(facets, points) {
	while (facets.length > 1) {
		var distanceArrays = getPolygonDistanceArraysByMesh(facets, points)
		var connection = getClosestConnection(distanceArrays)
		var firstFacet = getClosedFacet(connection.firstKeyIndex, facets[0])
		facets[0] = firstFacet.concat(getClosedFacet(connection.otherKeyIndex, facets[connection.polygonIndexPlus]))
		facets.splice(connection.polygonIndexPlus, 1)
	}
	return facets[0]
}
/*
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

function getConnectedXYPolygon(xyPolygons) {
	while (xyPolygons.length > 1) {
		var distanceArrays = getPolygonDistanceArraysByPolygons(xyPolygons)
		var connection = getClosestConnection(distanceArrays)
		var firstPolygon = getClosedPolygon(connection[0], xyPolygons[0])
		xyPolygons[0] = firstPolygon.concat(getClosedPolygon(connection[1], xyPolygons[connection[2]]))
		xyPolygons.splice(connection[2], 1)
	}
	return xyPolygons[0]
}
*/

function getDoubleTriangleArea(a, b, c) {
	var aX = a[0]
	var aY = a[1]
	return (b[0] - aX) * (aY - c[1]) + (b[1] - aY) * (c[0] - aX)
}

function getFacetsByArrowKeyMap(arrowKeyMap) {
	var facets = []
	for (var arrow of arrowKeyMap.values()) {
		if (arrow != null) {
			var arrowString = arrow.beginKey.toString() + ' ' + arrow.endKey.toString()
			var facet = [arrow.beginKey]
			arrowKeyMap.set(arrowString, null)
			do {
				if (arrowKeyMap.has(arrow.endKey)) {
					var nextArrow = arrowKeyMap.get(arrow.endKey)
					if (nextArrow == null) {
//						warningString = 'In getFacetsByarrowKeyMap, arrow.endKey:\n was null in the arrowKeyMap:\n from the facet:\n'
//						warning(warningString, [arrow, arrowKeyMap, facet])
						break
					}
					else {
						arrow = nextArrow
						arrowKeyMap.set(arrow.beginKey, null)
						facet.push(arrow.beginKey)
					}
				}
				else {
//					warningString = 'In getFacetsByarrowKeyMap, arrow.endKey:\n was not in the arrowKeyMap:\n from the facet:\n'
//					warning(warningString, [arrow, arrowKeyMap, facet])
					break
				}
				if (facet[0] == arrow.endKey) {
					facets.push(facet)
					break
				}
				if (facet.length > 987654) {
//					warningString = 'In getFacetsByarrowKeyMap, polygon is too large or there is a mistake, length: \narrowKey: \nfacet: '
//					warning(warningString, [facet.length, arrow, facet])
					break
				}
			}
			while (true)
		}
	}
	return facets
}

function getFacetsByArrowMap(arrowMap) {
	var facets = []
	for (var arrow of arrowMap.values()) {
		if (arrow != null) {
			var facet = [arrow.beginKey]
			arrowMap.set(arrow.beginKey, null)
			do {
				if (arrowMap.has(arrow.endKey)) {
					var nextArrow = arrowMap.get(arrow.endKey)
					if (nextArrow == null) {
//						warningString = 'In getFacetsByArrowMap, arrow.endKey:\n was null in the arrowMap:\n from the facet:\n'
//						warning(warningString, [arrow, arrowMap, facet])
						break
					}
					else {
						arrow = nextArrow
						arrowMap.set(arrow.beginKey, null)
						facet.push(arrow.beginKey)
					}
				}
				else {
//					warningString = 'In getFacetsByArrowMap, arrow.endKey:\n was not in the arrowMap:\n from the facet:\n'
//					warning(warningString, [arrow, arrowMap, facet])
					break
				}
				if (facet[0] == arrow.endKey) {
					facets.push(facet)
					break
				}
				if (facet.length > 987654) {
//					warningString = 'In getFacetsByArrowMap, polygon is too large or there is a mistake, length: \narrowKey: \nfacet: '
//					warning(warningString, [facet.length, arrow, facet])
					break
				}
			}
			while (true)
		}
	}
	return facets
}

function getInsideConnectedFacets(facets, points) {
	var linkMap = new Map()
	var xyPolygons = getPolygonsByFacets(facets, points)
	for (var polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		var maximumXIntersections = []
		var xyPolygon = xyPolygons[polygonIndex]
		for (var otherIndex = 0; otherIndex < xyPolygons.length; otherIndex++) {
			if (polygonIndex != otherIndex) {
				var xyOtherPolygon = xyPolygons[otherIndex]
				var maximumXIntersection = getMaximumXIntersectionByPolygon(xyPolygon[0], xyOtherPolygon)
				if (maximumXIntersection != null) {
					maximumXIntersections.push([maximumXIntersection, otherIndex])
				}
			}
		}
		var otherIndexSet = new Set()
		for (var maximumXIntersection of maximumXIntersections) {
			otherIndexSet.add(maximumXIntersection[1])
		}
		maximumXIntersections.sort(compareFirstElementDescending)
		if (otherIndexSet.size % 2 == 1) {
			addToLinkMap(polygonIndex, maximumXIntersections[0][1], linkMap)
		}
	}
	var joinedMap = getJoinedMap(xyPolygons.length, linkMap)
	var insideConnectedFacets = []
	for (var joined of joinedMap.values()) {
		var joinedFacets = []
		for (var joinedIndex of joined) {
			joinedFacets.push(facets[joinedIndex])
		}
		insideConnectedFacets.push(getConnectedFacet(joinedFacets, points))
	}
	return insideConnectedFacets
}
/*
function getInsideConnectedPolygons(xyPolygons) {
	var linkMap = new Map()
	for (var polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		var maximumXIntersections = []
		var xyPolygon = xyPolygons[polygonIndex]
		for (var otherIndex = 0; otherIndex < xyPolygons.length; otherIndex++) {
			if (polygonIndex != otherIndex) {
				var xyOtherPolygon = xyPolygons[otherIndex]
				var maximumXIntersection = getMaximumXIntersectionByPolygon(xyPolygon[0], xyOtherPolygon)
				if (maximumXIntersection != null) {
					maximumXIntersections.push([maximumXIntersection, otherIndex])
				}
			}
		}
		var otherIndexSet = new Set()
		for (var maximumXIntersection of maximumXIntersections) {
			otherIndexSet.add(maximumXIntersection[1])
		}
		maximumXIntersections.sort(compareFirstElementDescending)
		if (otherIndexSet.size % 2 == 1) {
			addToLinkMap(polygonIndex, maximumXIntersections[0][1], linkMap)
		}
	}
	var joinedMap = getJoinedMap(xyPolygons.length, linkMap)
	var insideConnectedXYPolygons = []
	for (var joined of joinedMap.values()) {
		var joinedPolygons = []
		for (var joinedIndex of joined) {
			joinedPolygons.push(xyPolygons[joinedIndex])
		}
		insideConnectedXYPolygons.push(getConnectedXYPolygon(joinedPolygons))
	}
	return insideConnectedXYPolygons
}
*/
function getIntersectionPairsMap(xyPolygons) {
	var intersectionPairsMap = new Map()
	var tripleIntersectionMap = new Map()
	for (var xyPolygon of xyPolygons) {
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
				addIntersectionsToTriple(xyBegin, xyEnd, tripleIntersection, y)
			}
		}
	}
	for (var y of tripleIntersectionMap.keys()) {
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
		for (var intersection of beginSet) {
			beginIntersections.push(intersection)
		}
		beginIntersections.sort(compareNumberAscending)
		var endIntersections = []
		for (var intersection of endSet) {
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
//				else {
//					console.log('endIndex < beginIndex, beginIndex: ' + beginIndex + '	endIndex: ' + endIndex)
//					console.log('beginIntersection: ' + beginIntersection + '	endIntersection: ' + endIntersection)
//					console.log('y: ' + y)
//					console.log('tripleIntersection.belows: ' + tripleIntersection.belows)
//					tripleIntersection.belows.sort(compareNumberAscending)
//					console.log('tripleIntersection.belows: ' + tripleIntersection.belows)
//				}
			}
		}
		else {
			console.log('beginIntersections.length: ' + beginIntersections.length + '   != endIntersections.length: endIntersections.length')
			console.log(intersections)
		}
		for (var intersectionPairIndex = 1; intersectionPairIndex < intersectionPairs.length; intersectionPairIndex++) {
			var intersectionPair = intersectionPairs[intersectionPairIndex]
			var previousIntersectionPair = intersectionPairs[intersectionPairIndex - 1]
			if (previousIntersectionPair.endIntersection == intersectionPair.beginIntersection) {
				warnings(['In getIntersectionPairsMap intersections meet', intersectionPairs, intersectionPairsMap])
			}
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

function getIsClockwise(polygon) {
	return getPolygonArea(polygon) > 0.0
}

function getIsColinear(beginPoint, centerPoint, endPoint) {
	var vectorA = getXYZSubtraction(centerPoint, beginPoint)
	var vectorB = getXYZSubtraction(endPoint, centerPoint)
	var vectorALength = getXYZLength(vectorA)
	var vectorBLength = getXYZLength(vectorB)
	if (vectorALength == 0.0 && vectorBLength == 0.0) {
		warningByList(['In getIsColinear both vectors have zero length:', vectorA, vectorB])
		return true
	}
	if (vectorALength == 0.0 || vectorBLength == 0.0) {
		warningByList(['In getIsColinear a vector has zero length:', vectorA, vectorB])
		return false
	}
	divideXYZByScalar(vectorA, vectorALength)
	divideXYZByScalar(vectorB, vectorBLength)
	return getXYZDotProduct(vectorA, vectorB) > 0.9999
}

function getIsPointInsidePolygon(point, polygon) {
	var numberOfIntersectionsToLeft = 0
	var x = point[0]
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	for (var xIntersection of xIntersections) {
		if (xIntersection < x) {
			numberOfIntersectionsToLeft += 1
		}
	}
	return numberOfIntersectionsToLeft % 2 == 1
}

function getIsPolygonIntersecting(polygonA, polygonB) {
	for (var point of polygonA) {
		if (getIsPointInsidePolygon(point, polygonB)) {
			return true
		}
	}
	for (var point of polygonB) {
		if (getIsPointInsidePolygon(point, polygonA)) {
			return true
		}
	}
	return false
}
/*
function getJoinedCoplanarPolygonKeyStrings(pointMap, polygonKeyStrings) {
	var arcMap = new Map()
	var polygonKeyStringLinkMap = new Map()
	for (var polygonKeyString of polygonKeyStrings) {
		polygon = polygonKeyString.split(' ')
		normalVector = getNormalVector(pointMap, polygonKeyString)
		for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			var key1 = polygon[(keyIndex + 1) % polygon.length]
			var key2 = polygon[(keyIndex + 2) % polygon.length]
			var arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length], normalVector, polygonKeyString]
			arcMap.set(key1 + ' ' + key2, arc)
		}
	}
	for (var arc of arcMap.values()) {
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
	for (var arc of arcMap.values()) {
		if (arc != null) {
			polygon = []
			linkHead = getLinkHead(arc[5], polygonKeyStringLinkMap)
			do {
				polygon.push(arc[1])
				arcMap.set(arc[1] + ' ' + arc[2], null)
				arc = arcMap.get(arc[2] + ' ' + arc[3])
			}
			while (arc != null);
			polygonKeyString = polygon.join(' ')
			addArrayElementToMap(polygonKeyString, linkHead, joinedPolygonKeyStringMap)
		}
	}
	var joinedPolygonKeyStrings = []
	for (var polygonKeyStrings of joinedPolygonKeyStringMap.values()) {
		joinedPolygonKeyStrings.push(getConnectedPolygonKeyString(pointMap, polygonKeyStrings))
	}
	return joinedPolygonKeyStrings
}
*/
function getJoinedFacets(facets) {
	var arcMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var beginArc = facet[vertexIndex]
			var beginKey = facet[(vertexIndex + 1) % facet.length]
			var endKey = facet[(vertexIndex + 2) % facet.length]
			var endArc = facet[(vertexIndex + 3) % facet.length]
			arcMap.set(beginKey + ' ' + endKey, [beginArc, endArc])
		}
	}
	for (var key of arcMap.keys()) {
		var arc = arcMap.get(key)
		if (arc != null) {
			var keyStrings = key.split(' ')
			var reversedKey = keyStrings[1] + ' ' + keyStrings[0]
			if (arcMap.has(reversedKey)) {
				var reversedArc = arcMap.get(reversedKey)
				if (reversedArc != null) {
					arcMap.get(arc[0] + ' ' + keyStrings[0])[1] = reversedArc[1]
					arcMap.get(keyStrings[1] + ' ' + arc[1])[0] = reversedArc[0]
					arcMap.get(reversedArc[0] + ' ' + keyStrings[1])[1] = arc[1]
					arcMap.get(keyStrings[0] + ' ' + reversedArc[1])[0] = arc[0]
					arcMap.set(key, null)
					arcMap.set(reversedKey, null)
				}
			}
		}
	}
	var joinedFacets = []
	for (var key of arcMap.keys()) {
		var arc = arcMap.get(key)
		if (arc != null) {
			var facet = []
			do {
				facet.push(arc[0])
				arcMap.set(key, null)
				key = key.split(' ')[1] + ' ' + arc[1]
				arc = arcMap.get(key)
			}
			while (arc != null);
			joinedFacets.push(facet)
		}
	}
	return joinedFacets
}

/*
function getJoinedFacetsBackup(facets) {
	var arrowMap = new Map()
	var arrowKeyMap = new Map()
	for (var facet of facets) {
		for (var keyIndex = 0; keyIndex < facet.length; keyIndex++) {
			var beginKey = facet[keyIndex]
			var endKey = facet[(keyIndex + 1) % facet.length]
			var arrowString = beginKey.toString() + ' ' + endKey.toString()
			var arrowStringReverse = endKey.toString() + ' ' + beginKey.toString()
			if (arrowKeyMap.has(arrowStringReverse)) {
				arrowKeyMap.delete(arrowStringReverse)
			}
			else {
				arrowKeyMap.set(arrowString, {beginKey:beginKey, endKey:endKey})
			}
			var shouldAddArrow = true
			if (arrowMap.has(endKey)) {
				var otherArrows = arrowMap.get(endKey)
				for (var otherArrowIndex = otherArrows.length - 1; otherArrowIndex > -1; otherArrowIndex--) {
					var otherArrow = otherArrows[otherArrowIndex]
					if (beginKey == otherArrow.endKey && endKey == otherArrow.beginKey) {
						shouldAddArrow = false
						otherArrows.splice(otherArrowIndex, 1)
						break
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
//				console.log(arrowSet)
	var shouldStop = false
//	var extraArrowArrays = []
	for (var key of arrowMap.keys()) {
		var arrows = arrowMap.get(key)
		arrowMap.set(key, arrows[0])
		if (arrows.length > 1) {
			warningByList(['In getJoinedFacets arrows.length > 1', arrows.length, arrows, facets])
//			return facets
//			extraArrowArrays.push(arrows)
//a[1]=1
//			shouldStop = true
//			return null
		}
//		else {
//		arrowMap.set(key, arrows[0])
//	}
	}
//	if (shouldStop) {
//a[1]=1
//		for (var extraArrows of extraArrowArrays) {
//			var extraArrow0 = extraArrows[0]
//			var extraArrow1 = extraArrows[1]
//			console.log(extraArrow0.beginKey + ',' + extraArrow0.endKey + ' ' + extraArrow1.beginKey + ',' + extraArrow1.endKey)
//		}
//	}
	return getFacetsByArrowMap(arrowMap)
}
*/

function getJoinedMap(length, linkMap) {
	var joinedMap = new Map()
	for (var index = 0; index < length; index++) {
		var linkHead = getLinkHead(index, linkMap)
		addArrayElementToMap(index, linkHead, joinedMap)
	}
	return joinedMap
}
/*
function getJoinedPolygonKeyStrings(polygonKeyStrings) {
	arcMap = new Map()
	for (var polygonKeyString of polygonKeyStrings) {
		polygon = polygonKeyString.split(' ')
		for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			key1 = polygon[(keyIndex + 1) % polygon.length]
			key2 = polygon[(keyIndex + 2) % polygon.length]
			arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length]]
//			arc = [polygon[keyIndex], key1, key2, polygon[(keyIndex + 3) % polygon.length], ' polygonKeyString ', polygonKeyString]
			arcMap.set(key1 + ' ' + key2, arc)
		}
	}
	for (var arc of arcMap.values()) {
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
	for (var arc of arcMap.values()) {
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

function getLinkHead(key, linkMap) {
	if (!linkMap.has(key)) {
		return key
	}
	var keys = [key]
	do {
		key = linkMap.get(key)
		keys.push(key)
		if (keys.length > 98765) {
			warningByList(['In getLinkHead keys.length > 98765', keys, linkMap])
			break
		}
	}
	while (linkMap.has(key))
	for (keyIndex = 0; keyIndex < keys.length - 1; keyIndex++) {
		linkMap.set(keys[keyIndex], key)
	}
	return key
}

function getMaximumXIntersectionByPolygon(xy, xyPolygonB) {
	var maximumX = -Number.MAX_VALUE
	var numberOfIntersectionsToLeft = 0
	var x = xy[0]
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, xyPolygonB, xy[1])
	for (var xIntersection of xIntersections) {
		if (xIntersection < x) {
			numberOfIntersectionsToLeft += 1
			maximumX = Math.max(maximumX, xIntersection)
		}
	}
	if (numberOfIntersectionsToLeft % 2 == 0) {
		return null
	}
	return maximumX
}
/*
function getNormalByPolygon(polygon) {
	if (polygon.length < 3) {
		return null
	}
	for (vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var pointZero = polygon[vertexIndex]
		var center = polygon[(vertexIndex + 1) % polygon.length]
		var pointTwo = polygon[(vertexIndex + 2) % polygon.length]
		var vectorA = getXYZSubtraction(pointZero, center)
		var vectorB = getXYZSubtraction(pointTwo, center)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		if (vectorALength != 0.0 && vectorBLength != 0.0) {
			divideXYZByScalar(vectorA, vectorALength)
			divideXYZByScalar(vectorB, vectorBLength)
			if (Math.abs(getXYZDotProduct(vectorA, vectorB)) < 0.9999999) {
				return normalizeXYZ(getCrossProduct(vectorA, vectorB))
			}
		}
	}
	return null
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
			if (Math.abs(getXYZDotProduct(vectorA, vectorB)) < 0.9999) {
				addXYZ(xyz, normalizeXYZ(getCrossProduct(vectorA, vectorB)))
				divisor += 1.0
			}
		}
	}
	return divideXYZByScalar(xyz, divisor)
}
*/
function getPointStringConvertedToPoints(pointString) {
	var parameterStrings = pointString.split(' ')
	for (parameterIndex = 0; parameterIndex < parameterStrings.length; parameterIndex++) {
		parameterStrings[parameterIndex] = parameterStrings[parameterIndex].split(',').map(parseFloat)
	}
	return parameterStrings
}

function getPolygonArea(polygon) {
	var polygonArea = 0.0
	for (var pointIndex = 0; pointIndex < polygon.length - 2; pointIndex++) {
		polygonArea += getDoubleTriangleArea(polygon[pointIndex], polygon[pointIndex + 1], polygon[pointIndex + 2])
	}
	return 0.5 * polygonArea
}

function getPolygonByFacet(facet, points) {
	var polygon = new Array(facet.length)
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		polygon[vertexIndex] = points[facet[vertexIndex]]
	}
	return polygon
}

function getPolygonByKeyString(keyString) {
	var polygon = keyString.split(' ')
	for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		polygon[keyIndex] = polygon[keyIndex].split(',').map(parseFloat)
	}
	return polygon
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

function getPolygonDistanceArraysByMesh(facets, points) {
	var facetLengthMinus = facets.length - 1
	var firstFacet = facets[0]
	var distanceArrays = new Array(firstFacet.length)
	for (firstKeyIndex = 0; firstKeyIndex < firstFacet.length; firstKeyIndex++) {
		var firstPoint = points[firstFacet[firstKeyIndex]]
		var otherPolygonIndex = 1
		var polygons = new Array(facetLengthMinus)
		for (var polygonIndex = 0; polygonIndex < facetLengthMinus; polygonIndex++) {
			var otherPolygon = facets[otherPolygonIndex]
			var polygon = new Array(otherPolygon.length)
			for (otherKeyIndex = 0; otherKeyIndex < otherPolygon.length; otherKeyIndex++) {
				var otherPoint = points[otherPolygon[otherKeyIndex]]
				var difference = getXYZSubtraction(firstPoint, otherPoint)
				polygon[otherKeyIndex] = getXYZLengthSquared(difference)
			}
			polygons[polygonIndex] = polygon
			otherPolygonIndex += 1
		}
		distanceArrays[firstKeyIndex] = polygons
	}
	return distanceArrays
}
/*
function getPolygonDistanceArraysByPolygons(xyPolygons) {
	var polygonLengthMinus = xyPolygons.length - 1
	var firstXYPolygon = xyPolygons[0]
	var distanceArrays = new Array(firstXYPolygon.length)
	for (var firstKeyIndex = 0; firstKeyIndex < firstXYPolygon.length; firstKeyIndex++) {
		var firstPoint = firstXYPolygon[firstKeyIndex]
		var otherPolygonIndex = 1
		var polygons = new Array(polygonLengthMinus)
		for (var polygonIndex = 0; polygonIndex < polygonLengthMinus; polygonIndex++) {
			var otherPolygon = xyPolygons[otherPolygonIndex]
			var polygon = new Array(otherPolygon.length)
			for (var otherKeyIndex = 0; otherKeyIndex < otherPolygon.length; otherKeyIndex++) {
				var otherPoint = otherPolygon[otherKeyIndex]
				var difference = getXYZSubtraction(firstPoint, otherPoint)
				polygon[otherKeyIndex] = getXYZLengthSquared(difference)
			}
			polygons[polygonIndex] = polygon
			otherPolygonIndex += 1
		}
		distanceArrays[firstKeyIndex] = polygons
	}
	return distanceArrays
}
*/
function getPolygonRotatedToBottom(polygon) {
	if (polygon.length == 0) {
		return polygon
	}
	var bottomIndex = 0
	var minimumKey = polygon[0]
	for (var keyIndex = 1; keyIndex < polygon.length; keyIndex++) {
		var key = polygon[keyIndex]
		if (key < minimumKey) {
			minimumKey = key
			bottomIndex = keyIndex
		}
	}
	var polygonRotatedToBottom = new Array(polygon.length)
	for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		polygonRotatedToBottom[keyIndex] = polygon[(keyIndex + bottomIndex) % polygon.length]
	}
	return polygonRotatedToBottom
}

function getPolygonsByArrowMap(arrowMap, pointMap) {
	var polygons = getFacetsByArrowMap(arrowMap)
	for (var polygon of polygons) {
		for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
			polygon[keyIndex] = pointMap.get(polygon[keyIndex] )
		}
	}
	return polygons
}

function getPolygonsByFacets(facets, points) {
	var polygons = new Array(facets.length)
	for (var polygonIndex = 0; polygonIndex < facets.length; polygonIndex++) {
		polygons[polygonIndex] = getPolygonByFacet(facets[polygonIndex], points)
	}
	return polygons
}

function getPolygonsByLines(lines, pointMap) {
	var arrowMap = new Map()
	for (var line of lines) {
		arrowMap.set(line.beginKey, line)
	}
	return getPolygonsByArrowMap(arrowMap, pointMap)
}

function getTriangleMiddle(a, b, c) {
	return multiplyXYZByScalar(addXYZ(addXYZ(getXYZAddition(b, b), a), c), 0.25)
}

function getXYPolygonsByArrows(arrowsMap, points, z) {
	var xyPolygons = []
	for (var arrows of arrowsMap.values()) {
		if (arrows != null) {
			var arrow = arrows[0]
			var keys = [arrow.beginKey]
			removeArrowFromMap(arrows, arrowsMap, arrow.beginKey)
			do {
				if (arrowsMap.has(arrow.endKey)) {
					var nextArrows = arrowsMap.get(arrow.endKey)
					if (nextArrows == null) {
						warningString = 'In getXYPolygonsByArrows, arrow.endKey:\n was null in the arrowsMap:\n from the keys:\n'
						warning(warningString, [arrow, arrowsMap, keys])
						break
					}
					else {
						var nextArrow = null
						for (var nextArrowIndex = nextArrows.length - 1; nextArrowIndex > -1; nextArrowIndex--) {
							var nextArrow = nextArrows[nextArrowIndex]
							if (arrow.beginKey == nextArrow.endKey && arrow.endKey == nextArrow.beginKey) {
								nextArrows.splice(nextArrowIndex, 1)
								break
							}
						}
						if (nextArrows.length == 0) {
							arrowsMap.set(arrow.endKey, null)
//							warningString = 'In getXYPolygonsByArrows, from the arrow.endKey:\n nextArrows.length == 0 in the arrowsMap:\n from the keys:\n'
//							warning(warningString, [arrow, arrowsMap, keys, xyPolygons])
							break
						}
						else {
							arrow = nextArrows[0]
							removeArrowFromMap(nextArrows, arrowsMap, arrow.beginKey)
							keys.push(arrow.beginKey)
						}
					}
				}
				else {
					warningString = 'In getXYPolygonsByArrows, arrow.endKey:\n was not in the arrowsMap:\n from the keys:\n'
					warning(warningString, [arrow, arrowsMap, keys])
					break
				}
				if (keys[0] == arrow.endKey) {
					xyPolygons.push(keys)
					break
				}
				if (keys.length > 987654) {
					warningString = 'In getXYPolygonsByArrows, polygon is too large or there is a mistake, length: \narrowKey: \nkeys: '
					warning(warningString, [keys.length, arrow, keys])
					break
				}
			}
			while (true)
		}
	}
	for (var xyPolygon of xyPolygons) {
		for (var keyIndex = 0; keyIndex < xyPolygon.length; keyIndex++) {
			xyPolygon[keyIndex] = getPointAlongEdge(xyPolygon[keyIndex], points, z)
		}
	}
	return xyPolygons
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

function getZByPointPolygon(point, polygon) {
	var greatestIndex = 0
	if (polygon.length > 3) {
		var greatestArea = getDoubleTriangleArea(polygon[0], polygon[1], polygon[2])
		for (var pointIndex = 1; pointIndex < polygon.length - 2; pointIndex++) {
			var doubleTriangleArea = getDoubleTriangleArea(polygon[pointIndex], polygon[pointIndex + 1], polygon[pointIndex + 2])
			if (doubleTriangleArea > greatestArea) {
				greatestArea = doubleTriangleArea
				greatestIndex = pointIndex
			}
		}
	}
	var a = polygon[greatestIndex]
	var b = polygon[greatestIndex + 1]
	var c = polygon[greatestIndex + 2]
	var bMinusA = getXYSubtraction(b, a)
	var bMinusALength = getXYLength(bMinusA)
	var bMinusAMmirror = [bMinusA[0] / bMinusALength, -bMinusA[1] / bMinusALength]
	var bMinusAX = bMinusA[0] * bMinusAMmirror[0] - bMinusA[1] * bMinusAMmirror[1]
	var cMinusA = getXYRotation(getXYSubtraction(c, a), bMinusAMmirror)
	var pointMinusA = getXYRotation(getXYSubtraction(point, a), bMinusAMmirror)
	var pointAlongC = pointMinusA[1] / cMinusA[1]
	var pointAlongB = (pointMinusA[0] - cMinusA[0] * pointAlongC) / bMinusAX
	var aMultiplied = getXYZMultiplicationByScalar(a, 1 - pointAlongB - pointAlongC)
	var bMultiplied = getXYZMultiplicationByScalar(b, pointAlongB)
	var cMultiplied = getXYZMultiplicationByScalar(c, pointAlongC)
	var xyz = addXYZ(addXYZ(aMultiplied, bMultiplied), cMultiplied)
	return xyz[2]
}

function rotateXYZParametersByPointList(rotation, pointList) {
	for (var point of pointList) {
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
	for (var pointList of pointLists) {
		rotateXYZParametersByPointList(rotation, pointList)
	}
}

function swapXY(xyPolygons) {
	for (var xyPolygon of xyPolygons) {
		for (var point of xyPolygon) {
			var x = point[0]
			point[0] = point[1]
			point[1] = x
		}
	}
}
