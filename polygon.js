//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addExtantPolygons(extantPolygons, nodeMaps, originalNodeMapIndex, turnRight) {
	var defaultProximity = -9
	if (turnRight) {
		defaultProximity = -defaultProximity
	}
	var originalMap = nodeMaps[originalNodeMapIndex]
	for (var nodeKey of originalMap.keys()) {
		var nodeStrings = nodeKey.split(',')
		var operatingNode = originalMap.get(nodeKey)
		if (nodeStrings[0] != 'm' && operatingNode != null) {
			var extantPolygon = []
			var firstKey = nodeKey
			var nodeMapIndex = originalNodeMapIndex
			var operatingMap = originalMap
			for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
				extantPolygon.push(nodeKey)
				var oldNode = operatingNode
				operatingNode = operatingMap.get(nodeKey)
				var nodeStrings = nodeKey.split(',')
				if (nodeStrings[0] == 'm') {
					var alternateProximity = defaultProximity
					var centerBegin = null
					var operatingProximity = defaultProximity
					centerBegin = getXYSubtraction(oldNode.point, oldNode.nextPoint)
					centerBeginLength = getXYLength(centerBegin)
					if (centerBeginLength == 0.0) {
						centerBegin = null
					}
					else {
						divideXYByScalar(centerBegin, centerBeginLength)
					}
					var alternateNodeIndex = 1 - nodeMapIndex
					var alternateMap = nodeMaps[alternateNodeIndex]
					var alternateNode = alternateMap.get(nodeKey)
					if (centerBegin != null) {
						if (alternateNode != null) {
							var centerAlternate = getXYSubtraction(alternateNode.nextPoint, alternateNode.point)
							var centerAlternateLength = getXYLength(centerAlternate)
							if (centerAlternateLength != 0.0) {
								divideXYByScalar(centerAlternate, centerAlternateLength)
								alternateProximity = getDirectionalProximity(centerBegin, centerAlternate)
							}
						}
						if (operatingNode != null) {
							var centerOperating = getXYSubtraction(operatingNode.nextPoint, operatingNode.point)
							var centerOperatingLength = getXYLength(centerOperating)
							if (centerOperatingLength != 0.0) {
								divideXYByScalar(centerOperating, centerOperatingLength)
								operatingProximity = getDirectionalProximity(centerBegin, centerOperating)
							}
						}
					}
					if (alternateProximity != operatingProximity) {
						var switchToAlternate = alternateProximity > operatingProximity
						if (turnRight) {
							switchToAlternate = alternateProximity < operatingProximity
						}
						if (switchToAlternate) {
							operatingMap = alternateMap
							operatingNode = alternateNode
							nodeMapIndex = alternateNodeIndex
						}
					}
					else {
						var alternateExtant = -1
						if (alternateNode != null) {
							alternateExtant = alternateNode.nextExtant
						}
						var operatingExtant = -1
						if (operatingNode != null) {
							operatingExtant = operatingNode.nextExtant
						}
						if (alternateExtant > operatingExtant) {
							operatingMap = alternateMap
							operatingNode = alternateNode
							nodeMapIndex = alternateNodeIndex
						}
					}
				}
				operatingMap.set(nodeKey, null)
				if (operatingNode == null) {
					extantPolygons.push(extantPolygon)
					break
				}
				nodeKey = operatingNode.nextKey
				if (nodeKey == firstKey) {
					extantPolygons.push(extantPolygon)
					break
				}
			}
		}
	}
}

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

function addMeetingToMap(along, alongIndexesMap, isNode, keyStart, meetingsLength, pointIndex, polygonLength) {
	if (isNode) {
		if (along < 0.5) {
			addArrayElementToMap([0.0, meetingsLength], keyStart + pointIndex.toString(), alongIndexesMap)
		}
		else {
			addArrayElementToMap([0.0, meetingsLength], keyStart + ((pointIndex + 1) % polygonLength).toString(), alongIndexesMap)
		}
		return
	}
	addArrayElementToMap([along, meetingsLength], keyStart + pointIndex.toString(), alongIndexesMap)
}

function addPolygonToNodeStrings(alongIndexesMap, nodeStrings, polygon, prefix, prefixOther) {
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		var endIndex = (pointIndex + 1) % polygon.length
		var alongIndexKey = prefix + ',' + pointIndex.toString()
		nodeStrings.push(alongIndexKey)
		if (alongIndexesMap.has(alongIndexKey)) {
			var alongIndexes = alongIndexesMap.get(alongIndexKey)
			for (var alongIndex of alongIndexes) {
				var meetingIndexString = alongIndex[1].toString()
				nodeStrings.push('m,' + meetingIndexString)
				nodeStrings.push('m,' + meetingIndexString)
			}
		}
		nodeStrings.push(prefix + ',' + endIndex.toString())
	}
}

function addToLinkMap(indexA, indexB, linkMap) {
	var top = Math.max(getLinkTopOnly(indexA, linkMap), getLinkTopOnly(indexB, linkMap))
	setLinkTop(indexA, linkMap, top)
	setLinkTop(indexB, linkMap, top)
}

function addToMeetingRemoval(alongIndexesMap, meetingRemovalSet) {
	for (var alongIndexes of alongIndexesMap.values()) {
		alongIndexes.sort(compareFirstElementAscending)
		for (var index = 1; index < alongIndexes.length; index++) {
			if (alongIndexes[index][0] == 0.0) {
				meetingRemovalSet.add(alongIndexes[index][1])
			}
		}
	}
}

function addXIntersectionsByPolygon(xIntersections, xyPolygon, y) {
	for (var pointIndex = 0; pointIndex < xyPolygon.length; pointIndex++) {
		addXIntersectionsBySegment(xyPolygon[pointIndex], xyPolygon[(pointIndex + 1) % xyPolygon.length], xIntersections, y)
	}
}

function addXIntersectionsByPolyline(xIntersections, xyPolyline, y) {
	for (var pointIndex = 0; pointIndex < xyPolyline.length - 1; pointIndex++) {
		addXIntersectionsBySegment(xyPolyline[pointIndex], xyPolyline[pointIndex + 1], xIntersections, y)
	}
}

function addXIntersectionsBySegment(begin, end, xIntersections, y) {
	if ((begin[1] == y) && (end[1] == y)) {
		xIntersections.push(begin[0])
		xIntersections.push(end[0])
	}
	else {
		if ((begin[1] < y) != (end[1] < y)) {
			deltaY = end[1] - begin[1]
			beginPortion = (end[1] - y) / deltaY
			endPortion = 1.0 - beginPortion
			xIntersections.push(beginPortion * begin[0] + endPortion * end[0])
		}
	}
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
		pointStrings[stringIndex] = getPointsByString(pointStrings[stringIndex])
	}
	return pointStrings
}

function convertXYPolygonsToXYZ(xyPolygons, z) {
	for (polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		xyPolygons[polygonIndex] = getXYZPolygon(xyPolygons[polygonIndex], z)
	}
	return xyPolygons
}

function getBoundingRectangle(polygon) {
	if (getIsEmpty(polygon)) {
		return null
	}
	var boundingBox = [polygon[0].slice(0, 2), polygon[0].slice(0, 2)]
	for (var pointIndex = 1; pointIndex < polygon.length; pointIndex++) {
		var point = polygon[pointIndex]
		boundingBox[0][0] = Math.min(boundingBox[0][0], point[0])
		boundingBox[0][1] = Math.min(boundingBox[0][1], point[1])
		boundingBox[1][0] = Math.max(boundingBox[1][0], point[0])
		boundingBox[1][1] = Math.max(boundingBox[1][1], point[1])
	}
	return boundingBox
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

function getClosestDistanceToIntersection(x, xIntersections) {
	var closestDistance = Number.MAX_VALUE
	for (var xIntersection of xIntersections) {
		var distance = Math.abs(xIntersection - x)
		if (distance < closestDistance) {
			closestDistance = distance
		}
	}
	return closestDistance
}

function getClosestPoint(gridMap, gridMultiplier, point) {
	var floorX = Math.floor(point[0] * gridMultiplier)
	var floorY = Math.floor(point[1] * gridMultiplier)
	var ceilingX = floorX + 1
	var ceilingY = floorY + 1
	var closestSquared = [null, null]
	setClosestSquaredByXY(closestSquared, gridMap, floorX, floorY, point)
	setClosestSquaredByXY(closestSquared, gridMap, floorX, ceilingY, point)
	setClosestSquaredByXY(closestSquared, gridMap, ceilingX, floorY, point)
	setClosestSquaredByXY(closestSquared, gridMap, ceilingX, ceilingY, point)
	if (closestSquared[0] != null) {
		return closestSquared[0]
	}
	for (var outward = 0;; outward++) {
		var outwardPlus = outward + outward + 4
		if (outwardPlus * outwardPlus > gridMap.size || outward > gLengthLimitRoot) {
			for (var key of gridMap.keys()) {
				setClosestSquared(closestSquared, gridMap, key, point)
			}
			return closestSquared[0]
		}
		floorX -= 1
		floorY -= 1
		ceilingX += 1
		ceilingY += 1
		var y = floorY
		for (var x = floorX; x < ceilingX; x++) {
			setClosestSquaredByXY(closestSquared, gridMap, x, floorY, point)
			setClosestSquaredByXY(closestSquared, gridMap, x + 1, ceilingY, point)
			setClosestSquaredByXY(closestSquared, gridMap, floorX, y + 1, point)
			setClosestSquaredByXY(closestSquared, gridMap, ceilingX, y, point)
			y += 1
		}
		if (closestSquared[0] != null) {
			return closestSquared[0]
		}
	}
}

function getClosePointIndex(gridMap, point, points) {
	var floorX = Math.floor(point[0] * gOneOverClose)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * gOneOverClose)
	var floorYPlus = floorY + 2
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				return gridMap.get(key)
			}
		}
	}
	var pointsLength = points.length
	gridMap.set(Math.round(point[0] * gOneOverClose).toString() + ' ' + Math.round(point[1] * gOneOverClose).toString(), pointsLength)
	points.push(point)
	return pointsLength
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

function getDirectedPolygon(clockwise, polygon) {
	if (getIsClockwise(polygon) == clockwise) {
		return polygon
	}
	return polygon.slice(0).reverse()
}

function getDistanceToLine(begin, end, point) {
	var delta = getXYSubtraction(end, begin)
	var deltaLength = getXYLength(delta)
	if (deltaLength == 0.0) {
		return getXYDistance(begin, point)
	}
	divideXYByScalar(delta, deltaLength)
	return Math.abs(point[1] * delta[0] - point[0] * delta[1] - begin[1] * delta[0] + begin[0] * delta[1])
}

function getDoublePolygonArea(polygon) {
	var polygonArea = 0.0
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		var nextPoint = polygon[(pointIndex + 1) % polygon.length]
		polygonArea += polygon[pointIndex][1] * nextPoint[0] - polygon[pointIndex][0] * nextPoint[1]
	}
	return polygonArea
}

function getDoubleTriangleArea(a, b, c) {
	var aX = a[0]
	var aY = a[1]
	return (b[0] - aX) * (aY - c[1]) + (b[1] - aY) * (c[0] - aX)
}

function getExtantNodeMap(alongIndexesMap, extantInsideness, meetings, otherPolygon, polygon, prefix, prefixOther) {
	var nodes = []
	var extantNodeMap = new Map()
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var nodeKey = prefix + ',' + vertexIndex.toString()
		var point = polygon[vertexIndex]
		var extant = getPolygonInsideness(point, otherPolygon)
		if (!extantInsideness) {
			extant = -extant
		}
		nodes.push({extant:extant, nodeKey:nodeKey, point:point})
		if (alongIndexesMap.has(nodeKey)) {
			var alongIndexes = alongIndexesMap.get(nodeKey)
			for (var alongIndex of alongIndexes) {
				var meetingIndex = alongIndex[1]
				var nodeKey = 'm,' + meetingIndex.toString()
				if (alongIndex[0] == 0.0) {
					nodes.pop()
				}
				point = meetings[meetingIndex].point
				var extant = getPolygonInsideness(point, otherPolygon)
				if (!extantInsideness) {
					extant = -extant
				}
				nodes.push({extant:extant, nodeKey:nodeKey, point:point})
			}
		}
	}
	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var beginNode = nodes[nodeIndex]
		var centerNode = nodes[(nodeIndex + 1) % nodes.length]
		if (beginNode.extant > -1 && centerNode.extant > -1) {
			var extantNode = {
				nextExtant:centerNode.extant,
				nextKey:centerNode.nodeKey,
				nextPoint:centerNode.point,
				nodeKey:beginNode.nodeKey,
				point:beginNode.point}
			extantNodeMap.set(beginNode.nodeKey, extantNode)
		}
	}
	return extantNodeMap
}
//deprecated
function getPointByNode(node, meetings, polygon) {
	var nodeStrings = node.split(',')
	if (nodeStrings[0] == 'm') {
		return meetings[parseInt(nodeStrings[1])].point
	}
	return polygon[parseInt(nodeStrings[1])]
}

function getMidpointByStrings(beginNode, endNode, meetings, polygon) {
	var beginPoint = getPointByNode(beginNode, meetings, polygon)
	var endPoint = getPointByNode(endNode, meetings, polygon)
	return getXYMultiplicationByScalar(getXYAddition(beginPoint, endPoint), 0.5)
}

function addPolygonToNodeStrings(alongIndexesMap, nodeStrings, polygon, prefix, prefixOther) {
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		var endIndex = (pointIndex + 1) % polygon.length
		var alongIndexKey = prefix + ',' + pointIndex.toString()
		nodeStrings.push(alongIndexKey)
		if (alongIndexesMap.has(alongIndexKey)) {
			var alongIndexes = alongIndexesMap.get(alongIndexKey)
			for (var alongIndex of alongIndexes) {
				var meetingIndexString = alongIndex[1].toString()
				nodeStrings.push('m,' + meetingIndexString + ',' + prefixOther)
				nodeStrings.push('m,' + meetingIndexString + ',' + prefix)
			}
		}
		nodeStrings.push(prefix + ',' + endIndex.toString())
	}
}

function getExtantInsideness(operator) {
	if (operator[0] == 'd') {
		return {tool:1, work:-1}
	}
	if (operator[0] == 'i') {
		return {tool:1, work:1}
	}
	return {tool:-1, work:-1}
}

function getExtantPolygonsOld(alongIndexesMap, extantInsideness, meetings, toolPolygon, workPolygon) {
	var arrowMap = new Map()
	var extantSet = new Set()
	var toolStrings = []
	var workStrings = []
	addPolygonToNodeStrings(alongIndexesMap, toolStrings, toolPolygon, 't', 'w')
	addPolygonToNodeStrings(alongIndexesMap, workStrings, workPolygon, 'w', 't')
	for (var toolStringsIndex = 0; toolStringsIndex < toolStrings.length; toolStringsIndex += 2) {
		var beginNode = toolStrings[toolStringsIndex]
		var endNode = toolStrings[toolStringsIndex + 1]
		var insideness = getPolygonInsideness(getMidpointByStrings(beginNode, endNode, meetings, toolPolygon), workPolygon)
		if (insideness == 0) {
			var endInsideness = getPolygonInsideness(getPointByNode(endNode, meetings, toolPolygon), workPolygon)
			if (endInsideness == 0 || endInsideness == extantInsideness.tool) {
				arrowMap.set(beginNode, endNode)
			}
		}
		else {
			if (insideness == extantInsideness.tool) {
				arrowMap.set(beginNode, endNode)
				extantSet.add(beginNode)
			}
		}
	}
	for (var workStringsIndex = 0; workStringsIndex < workStrings.length; workStringsIndex += 2) {
		var beginNode = workStrings[workStringsIndex]
		var endNode = workStrings[workStringsIndex + 1]
		var insideness = getPolygonInsideness(getMidpointByStrings(beginNode, endNode, meetings, workPolygon), toolPolygon)
		if (insideness == 0) {
			var endInsideness = getPolygonInsideness(getPointByNode(endNode, meetings, workPolygon), toolPolygon)
			if (endInsideness == 0 || endInsideness == extantInsideness.work) {
				arrowMap.set(beginNode, endNode)
			}
		}
		else {
			if (insideness == extantInsideness.work) {
				arrowMap.set(beginNode, endNode)
				extantSet.add(beginNode)
			}
		}
	}
	console.log('arrowMap')
	console.log(arrowMap)
	console.log(extantSet)
	console.log(meetings)
	var alternateKeyMap = new Map()
	alternateKeyMap.set('t', 'w')
	alternateKeyMap.set('w', 't')
	var extantPolygons = []
	for (var arrowKey of arrowMap.keys()) {
		var arrowValue = arrowMap.get(arrowKey)
		if (arrowValue != null && extantSet.has(arrowKey)) {
			var extantPolygon = []
			var firstKey = null
			extantPolygons.push(extantPolygon)
			for (var whileIndex = 0; whileIndex < 9876543; whileIndex++) {
				if (extantPolygon.length == 0) {
					firstKey = arrowKey
					arrowMap.set(arrowKey, 's')
				}
				else {
					if (arrowValue == 's' || arrowValue == null) {
						arrowMap.set(firstKey, null)
						break
					}
					else {
						arrowMap.set(arrowKey, null)
					}
				}
				extantPolygon.push(arrowKey)
				arrowKey = arrowValue
				if (arrowMap.has(arrowKey)) {
					arrowValue = arrowMap.get(arrowKey)
				}
				else {
					arrowValue = null
				}
				if (arrowValue == null) {
					var keyStrings = arrowKey.split(',')
					var alternateKey = 'm,' + keyStrings[1] + ',' + alternateKeyMap.get(keyStrings[2])
					if (arrowMap.has(alternateKey)) {
						arrowKey = alternateKey
						arrowValue = arrowMap.get(arrowKey)
					}
				}
			}
		}
	}
	return extantPolygons
}

function getExtantPolygons(alongIndexesMap, meetings, operator, toolPolygon, workPolygon) {
	var toolExtantInsideness = true
	var workExtantInsideness = true
	if (operator[0] == 'd') {
		workExtantInsideness = false
	}
	else {
		if (operator[0] == 'u') {
			toolExtantInsideness = false
			workExtantInsideness = false
		}
	}
	var turnRight = getIsClockwise(workPolygon)
	if (operator == 'u') {
		turnRight = !turnRight
	}
	var toolNodeMap = getExtantNodeMap(alongIndexesMap, toolExtantInsideness, meetings, workPolygon, toolPolygon, 't', 'w')
	var workNodeMap = getExtantNodeMap(alongIndexesMap, workExtantInsideness, meetings, toolPolygon, workPolygon, 'w', 't')
	var extantPolygons = []
	var nodeMaps = [toolNodeMap, workNodeMap]
	addExtantPolygons(extantPolygons, nodeMaps, 1, turnRight)
	addExtantPolygons(extantPolygons, nodeMaps, 0, turnRight)
	return extantPolygons
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
				if (facet.length > gLengthLimit) {
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

function getGridMultiplier(gridMap, points) {
	if (getIsEmpty(points)) {
		return null
	}
	var firstPoint = points[0]
	var minimumX = firstPoint[0]
	var maximumX = firstPoint[0]
	var minimumY = firstPoint[1]
	var maximumY = firstPoint[1]
	for (var pointIndex = 1; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var minimumX = Math.min(minimumX, point[0])
		var maximumX = Math.max(maximumX, point[0])
		var minimumY = Math.min(minimumY, point[1])
		var maximumY = Math.max(maximumY, point[1])
	}
	var maximumRange = Math.max(maximumX - minimumX, maximumY - minimumY)
	var gridMultiplier = 2.0 * (Math.sqrt(points.length) + 1) / maximumRange
	for (var point of points) {
		var key = Math.round(point[0] * gridMultiplier).toString() + ' ' + Math.round(point[1] * gridMultiplier).toString()
		addArrayElementToMap(point, key, gridMap)
	}
	return gridMultiplier
}

function getIndexRange(elements, index) {
	if (elements.length == 0) {
		return null
	}
	var minimum = elements[0][index]
	var minimumIndex = 0
	var maximum = elements[0][index]
	var maximumIndex = 0
	for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
		var elementValue = elements[elementIndex][index]
		if (elementValue < minimum) {
			minimum = elementValue
			minimumIndex = elementIndex
		}
		else {
			if (elementValue > maximum) {
				maximum = elementValue
				maximumIndex = elementIndex
			}
		}
	}
	return [minimumIndex, maximumIndex]
}

function getInsetDelta(centerBegin, centerEnd) {
	var insetDelta = getXYAddition(centerBegin, centerEnd)
	var endRight = [centerEnd[1], -centerEnd[0]]
	var dotProductPerpendicular = getXYDotProduct(endRight, insetDelta)
	if (dotProductPerpendicular == 0.0) {
		return endRight
	}
	return divideXYByScalar(insetDelta, dotProductPerpendicular)
}

function getInsetPoint(centerBegin, centerPoint, centerEnd, inset) {
	return addXY(centerPoint.slice(0), getXYMultiplication(getInsetDelta(centerBegin, centerEnd), inset))
}

function getInsetPolygon(insets, polygon) {
	removeIdenticalXYPoints(polygon)
	var inset = [1.0, 1.0]
	var insetPolygon = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		if (vertexIndex < insets.length) {
			inset = insets[vertexIndex]
			if (inset.length == 1) {
				inset = [inset[0], inset[0]]
			}
		}
		var beginIndex = (vertexIndex - 1 + polygon.length) % polygon.length
		var beginPoint = polygon[beginIndex]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = getXYSubtraction(beginPoint, centerPoint)
		var centerBeginLength = getXYLength(centerBegin)
		divideXYByScalar(centerBegin, centerBeginLength)
		var endIndex = (vertexIndex + 1) % polygon.length
		var endPoint = polygon[endIndex]
		var centerEnd = getXYSubtraction(endPoint, centerPoint)
		var centerEndLength = getXYLength(centerEnd)
		divideXYByScalar(centerEnd, centerEndLength)
		insetPolygon[vertexIndex] = getInsetPoint(centerBegin, centerPoint, centerEnd, inset)
	}
	return insetPolygon
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

function getIsAwayFromHeight(splitHeight, workBeginY, workEndY) {
	var splitHeightMinus = splitHeight - gClose
	var splitHeightPlus = splitHeight + gClose
	if (workBeginY < splitHeightMinus && workEndY < splitHeightMinus) {
		return true
	}
	return workBeginY > splitHeightPlus && workEndY > splitHeightPlus
}

function getIsClockwise(polygon) {
	return getDoublePolygonArea(polygon) > 0.0
}

function getIsPointInsidePolygon(point, polygon) {
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	if (getNumberOfIntersectionsToLeft(point[0], xIntersections) % 2 == 1) {
		return true
	}
	swapXYPoint(point)
	swapXYPolygon(polygon)
	xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	var x = point[0]
	swapXYPoint(point)
	swapXYPolygon(polygon)
	return getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1
}

function getIsPointInsidePolygonOrClose(point, polygon) {
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	var x = point[0]
	if (getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1) {
		return true
	}
	for (var xIntersection of xIntersections) {
		if (Math.abs(xIntersection - x) < gClose) {
			return true
		}
	}
	swapXYPoint(point)
	swapXYPolygon(polygon)
	xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, point[1])
	x = point[0]
	swapXYPoint(point)
	swapXYPolygon(polygon)
	for (var xIntersection of xIntersections) {
		if (Math.abs(xIntersection - x) < gClose) {
			return true
		}
	}
	return getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1
}
function getIsPolygonIntersecting(toolPolygon, workPolygon) {
	for (var point of toolPolygon) {
		if (getIsPointInsidePolygon(point, workPolygon)) {
			return true
		}
	}
	for (var point of workPolygon) {
		if (getIsPointInsidePolygon(point, toolPolygon)) {
			return true
		}
	}
	for (var toolPointIndex = 0; toolPointIndex < toolPolygon.length; toolPointIndex++) {
		var toolEndIndex = (toolPointIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolPointIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = getXYSubtraction(toolEnd, toolBegin)
		var deltaLength = getXYLength(delta)
		if (deltaLength != 0.0) {
			divideXYByScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = getXYRotation(toolBegin, reverseRotation)
			var toolEndRotated = getXYRotation(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			var workPolygonRotated = getXYRotations(workPolygon, reverseRotation)
			for (var workBeginIndex = 0; workBeginIndex < workPolygonRotated.length; workBeginIndex++) {
				var workEndIndex = (workBeginIndex + 1) % workPolygonRotated.length
				var workBeginRotated = workPolygonRotated[workBeginIndex]
				var workEndRotated = workPolygonRotated[workEndIndex]
				if (getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated) != null) {
					return true
				}
			}
		}
	}
	return false
}

function getIsTriangleTooThin(triangle) {
	for (var vertexIndex = 0; vertexIndex < triangle.length; vertexIndex++) {
		var endIndex = (vertexIndex + 2) % triangle.length
		if (getIsXYSegmentClose(triangle[vertexIndex], triangle[endIndex], triangle[(vertexIndex + 1) % triangle.length])) {
			return true
		}
	}
	return false
}

function getIsXYSegmentClose(begin, end, point) {
	var delta = getXYSubtraction(end, begin)
	var deltaLength = getXYLength(delta)
	if (deltaLength == 0.0) {
		return getXYDistanceSquared(begin, point) < gCloseSquared
	}
	divideXYByScalar(delta, deltaLength)
	var reverseRotation = [delta[0], -delta[1]]
	var beginRotated = getXYRotation(begin, reverseRotation)
	var endRotated = getXYRotation(end, reverseRotation)
	var pointRotated = getXYRotation(point, reverseRotation)
	if (pointRotated[0] < beginRotated[0]) {
		return getXYDistanceSquared(begin, point) < gCloseSquared
	}
	if (pointRotated[0] > endRotated[0]) {
		return getXYDistanceSquared(end, point) < gCloseSquared
	}
	return Math.abs(pointRotated[1] - endRotated[1]) < gClose
}

function getIsXYZCollinear(beginPoint, centerPoint, endPoint) {
	var vectorA = getXYZSubtraction(centerPoint, beginPoint)
	var vectorB = getXYZSubtraction(endPoint, centerPoint)
	var vectorALength = getXYZLength(vectorA)
	var vectorBLength = getXYZLength(vectorB)
	if (vectorALength == 0.0 && vectorBLength == 0.0) {
		warningByList(['In getIsCollinear both vectors have zero length:', vectorA, vectorB])
		return true
	}
	if (vectorALength == 0.0 || vectorBLength == 0.0) {
		warningByList(['In getIsCollinear a vector has zero length:', vectorA, vectorB])
		return false
	}
	divideXYZByScalar(vectorA, vectorALength)
	divideXYZByScalar(vectorB, vectorBLength)
	return Math.abs(getXYZDotProduct(vectorA, vectorB)) > 0.9999
}

function getIsXYZSegmentClose(begin, end, point) {
	var delta = getXYSubtraction(end, begin)
	var deltaLength = getXYLength(delta)
	if (deltaLength == 0.0) {
		return getXYZDistanceSquared(begin, point) < gCloseSquared
	}
	divideXYZByScalar(delta, deltaLength)
	var reverseRotation = [delta[0], -delta[1]]
	var beginRotated = getXYRotation(begin, reverseRotation)
	var endRotated = getXYRotation(end, reverseRotation)
	var pointRotated = getXYRotation(point, reverseRotation)
	if (pointRotated[0] < beginRotated[0]) {
		return getXYZDistanceSquared(begin, point) < gCloseSquared
	}
	if (pointRotated[0] > endRotated[0]) {
		return getXYZDistanceSquared(end, point) < gCloseSquared
	}
	var pointAlong = (pointRotated[0] - beginRotated[0]) / (endRotated[0] - beginRotated[0])
	var xyDistance = Math.abs(pointRotated[1] - endRotated[1])
	var deltaHeight = point[2] - begin[2] * (1.0 - pointAlong) - end[2] * pointAlong
	return xyDistance * xyDistance + deltaHeight * deltaHeight < gCloseSquared
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
			linkTop = getLinkTop(arc[5], polygonKeyStringLinkMap)
			do {
				polygon.push(arc[1])
				arcMap.set(arc[1] + ' ' + arc[2], null)
				arc = arcMap.get(arc[2] + ' ' + arc[3])
			}
			while (arc != null);
			polygonKeyString = polygon.join(' ')
			addArrayElementToMap(polygonKeyString, linkTop, joinedPolygonKeyStringMap)
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
	return addFacetsByArrowMap(arrowMap, [])
}
*/

function getJoinedMap(length, linkMap) {
	var joinedMap = new Map()
	for (var index = 0; index < length; index++) {
		var linkTop = getLinkTop(index, linkMap)
		addArrayElementToMap(index, linkTop, joinedMap)
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

function getLinkTop(key, linkMap) {
	var top = getLinkTopOnly(key, linkMap)
	setLinkTop(key, linkMap, top)
	return top
}

function getLinkTopOnly(key, linkMap) {
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
}

function getMaximumInset(polygon) {
	var minimumWidth = getMinimumWidth(polygon)
	return minimumWidth * 0.3 / (1.0 - getMinimumWidth(getInsetPolygon([[0.3 * minimumWidth]], polygon)) / minimumWidth)
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

function getMeeting(toolBeginX, toolEndX, toolY, workBegin, workEnd) {
	if (toolBeginX == toolEndX) {
		return null
	}
	if (toolBeginX > toolEndX) {
		console.log('should never happen toolBeginX > toolEndX:' + toolBeginX + '    toolEndX:' + toolEndX)
		console.log('toolBeginX:' + toolBeginX + '    toolEndX:' + toolEndX)
	}
	var toolBeginXMinus = toolBeginX - gClose
	var toolEndXPlus = toolEndX + gClose
	var toolYMinus = toolY - gClose
	var toolYPlus = toolY + gClose
	var workBeginX = workBegin[0]
	var workEndX = workEnd[0]
	var workBeginY = workBegin[1]
	var workEndY = workEnd[1]
	if (workBeginX < toolBeginXMinus && workEndX < toolBeginXMinus) {
		return null
	}
	if (workBeginX > toolEndXPlus && workEndX > toolEndXPlus) {
		return null
	}
	if (workBeginY < toolYMinus && workEndY < toolYMinus) {
		return null
	}
	if (workBeginY > toolYPlus && workEndY > toolYPlus) {
		return null
	}
	var deltaY = workEndY - workBeginY
	if (Math.abs(deltaY) < gThousanthsClose) {
		return null
	}
	var workAlong = (toolY - workBeginY) / deltaY
	var toolInterceptX = (1.0 - workAlong) * workBeginX + workAlong * workEndX
	if (toolInterceptX < toolBeginXMinus) {
		return null
	}
	if (toolInterceptX > toolEndXPlus) {
		return null
	}
	var toolAlong = (toolInterceptX - toolBeginX) / (toolEndX - toolBeginX)
	var isToolNode = false
	if (toolAlong < gClose || toolAlong > gOneMinusClose) {
		isToolNode = true
	}
	var isWorkNode = workAlong < gClose || workAlong > gOneMinusClose
	return {isToolNode:isToolNode, isWorkNode:isWorkNode, toolAlong:toolAlong, workAlong:workAlong}
}

function getMeetingByHeight(splitHeight, workBegin, workEnd) {
	if (getXYDistanceSquared(workBegin, workEnd) == 0.0) {
		return null
	}
	var workBeginY = workBegin[1]
	var workEndY = workEnd[1]
	if (getIsAwayFromHeight(splitHeight, workBeginY, workEndY)) {
		return null
	}
	var deltaY = workEndY - workBeginY
	if (Math.abs(deltaY) < gThousanthsClose) {
		return null
	}
	var workAlong = (splitHeight - workBeginY) / deltaY
	var toolAlong = (1.0 - workAlong) * workBegin[0] + workAlong * workEnd[0]
	return {isWorkNode:workAlong < gClose || workAlong > gOneMinusClose, toolAlong:toolAlong, workAlong:workAlong}
}

function getMinimumWidth(polygon) {
	var minimumWidth = null
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = getXYSubtraction(beginPoint, centerPoint)
		var centerBeginLength = getXYLength(centerBegin)
		divideXYByScalar(centerBegin, centerBeginLength)
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerEnd = getXYSubtraction(endPoint, centerPoint)
		var centerEndLength = getXYLength(centerEnd)
		divideXYByScalar(centerEnd, centerEndLength)
		var insetDelta = getInsetDelta(centerBegin, centerEnd)
		var insetDeltaLength = getXYLength(insetDelta)
		if (insetDeltaLength != 0.0) {
			divideXYByScalar(insetDelta, insetDeltaLength)
			var xyRotator = [insetDelta[0], -insetDelta[1]]
			var polygonRotated = getXYRotations(polygon, xyRotator)
			var polylineRotated = polygonRotated.slice(vertexIndex + 1)
			pushArray(polylineRotated, polygonRotated.slice(0, vertexIndex))
			var centerRotated = polygonRotated[vertexIndex]
			var xIntersections = []
			addXIntersectionsByPolyline(xIntersections, polylineRotated, centerRotated[1])
			for (var xIntersection of xIntersections) {
				if (xIntersection > centerRotated[0]) {
					var width = xIntersection - centerRotated[0]
					if (minimumWidth == null) {
						minimumWidth = width
					}
					else {
						if (width < minimumWidth) {
							minimumWidth = width
						}
					}
				}
			}
		}
	}
	if (minimumWidth == null) {
		return 0.0
	}
	return minimumWidth
}

function getNormalByPolygon(polygon) {
	if (polygon.length < 3) {
		return null
	}
	var normal = [0.0, 0.0, 0.0]
	for (vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var center = polygon[vertexIndex]
		var pointA = polygon[(vertexIndex + 1) % polygon.length]
		var pointB = polygon[(vertexIndex + 2) % polygon.length]
		var vectorA = getXYZSubtraction(pointA, center)
		var vectorB = getXYZSubtraction(pointB, center)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		var crossProduct = getCrossProduct(vectorA, vectorB)
		addXYZ(normal, crossProduct)
	}
	var normalLength = getXYZLength(normal)
	if (normalLength == 0.0) {
		return null
	}
	return divideXYZByScalar(normal, normalLength)
}

function getNormalByPolygonIfFlat(polygon) {
	if (polygon.length < 3) {
		return null
	}
	var lastNormal = null
	var crossProductLengthTotal = 0.0
	for (vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var center = polygon[vertexIndex]
		var pointA = polygon[(vertexIndex + 1) % polygon.length]
		var pointB = polygon[(vertexIndex + 2) % polygon.length]
		var vectorA = getXYZSubtraction(pointA, center)
		var vectorB = getXYZSubtraction(pointB, center)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		if (vectorALength != 0.0 && vectorBLength != 0.0) {
			divideXYZByScalar(vectorA, vectorALength)
			divideXYZByScalar(vectorB, vectorBLength)
			if (Math.abs(getXYZDotProduct(vectorA, vectorB)) < 0.9999999) {
				var crossProduct = getCrossProduct(vectorA, vectorB)
				var crossProductLength = getXYZLength(crossProduct)
				var normal = divideXYZByScalar(crossProduct, crossProductLength)
				if (lastNormal == null) {
					lastNormal = normal
					crossProductLengthTotal += crossProductLength
				}
				else {
					if (getXYZLengthSquared(getXYZSubtraction(normal, lastNormal)) < 0.00000000000001) {
						crossProductLengthTotal += crossProductLength
					}
					else {
						invertXYZ(normal)
						if (getXYZLengthSquared(getXYZSubtraction(normal, lastNormal)) < 0.00000000000001) {
							crossProductLengthTotal -= crossProductLength
						}
						else {
							return null
						}
					}
				}
			}
		}
	}
	if (crossProductLengthTotal < 0.0) {
		return invertXYZ(lastNormal)
	}
	return lastNormal
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

function getNumberOfIntersectionsToLeft(x, xIntersections) {
	var numberOfIntersectionsToLeft = 0
	for (var xIntersection of xIntersections) {
		if (xIntersection < x) {
			numberOfIntersectionsToLeft += 1
		}
	}
	return numberOfIntersectionsToLeft
}

function getOperatedPolygons(operator, toolPolygon, workPolygon) {
	var alongIndexesMap = new Map()
	var meetings = []
	toolPolygon = getOperatorDirectedPolygon(getIsClockwise(workPolygon), operator, toolPolygon)
	for (var toolPointIndex = 0; toolPointIndex < toolPolygon.length; toolPointIndex++) {
		var toolEndIndex = (toolPointIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolPointIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = getXYSubtraction(toolEnd, toolBegin)
		var deltaLength = getXYLength(delta)
		if (deltaLength != 0.0) {
			divideXYByScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = getXYRotation(toolBegin, reverseRotation)
			var toolEndRotated = getXYRotation(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			var workPolygonRotated = getXYRotations(workPolygon, reverseRotation)
			for (var workBeginIndex = 0; workBeginIndex < workPolygon.length; workBeginIndex++) {
				var workEndIndex = (workBeginIndex + 1) % workPolygon.length
				var workBeginRotated = workPolygonRotated[workBeginIndex]
				var workEndRotated = workPolygonRotated[workEndIndex]
				var meeting = getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated)
				if (meeting != null) {
					meeting.workBeginIndex = workBeginIndex
					meeting.workEndIndex = workEndIndex
					if (meeting.isWorkNode) {
						if (meeting.workAlong < 0.5) {
							meeting.point = workPolygon[workBeginIndex]
						}
						else {
							meeting.point = workPolygon[workEndIndex]
						}
					}
					else {
						meeting.point = null
					}
					if (meeting.isToolNode && meeting.point == null) {
						if (meeting.toolAlong < 0.5) {
							meeting.point = toolPolygon[toolPointIndex]
						}
						else {
							meeting.point = toolPolygon[toolEndIndex]
						}
					}
					if (meeting.point == null) {
						meeting.point = workPolygon[workBeginIndex].slice(0)
						multiplyArrayByScalar(meeting.point, (1.0 - meeting.workAlong))
						addArray(meeting.point, getArrayMultiplicationByScalar(workPolygon[workEndIndex], meeting.workAlong))
					}
					addMeetingToMap(
						meeting.toolAlong,
						alongIndexesMap,
						meeting.isToolNode,
						't,',
						meetings.length,
						toolPointIndex,
						toolPolygon.length)
					addMeetingToMap(
						meeting.workAlong,
						alongIndexesMap,
						meeting.isWorkNode,
						'w,',
						meetings.length,
						workBeginIndex,
						workPolygon.length)
					meetings.push(meeting)
				}
			}
		}
	}
	sortRemoveMeetings(alongIndexesMap)
	console.log('alongIndexesMap')
	console.log(alongIndexesMap)
	var extantPolygons = getExtantPolygons(alongIndexesMap, meetings, operator, toolPolygon, workPolygon)
/*
	var meetingToolWorkMap = new Map()
	for (var alongIndexesEntry of alongIndexesMap) {
		var alongIndexes = alongIndexesEntry[1]
		var alongStrings = alongIndexesEntry[0].split(',')
		for (var alongIndex of alongIndexes) {
			var meeting = meetings[parseInt(alongIndex[1])]
			nodeKey = null
			if (alongStrings[0] == 't') {
				if (meeting.isToolNode) {
					nodeKey = 't,' + alongStrings[1]
				}
			}
			else {
				if (meeting.isWorkNode) {
					nodeKey = 'w,' + alongStrings[1]
				}
			}
			if (nodeKey != null) {
				addArrayElementToMap(nodeKey, 'm,' + alongIndex[1], meetingToolWorkMap)
			}
		}
	}
	var meetingToolWorkEntries = []
	for (var meetingToolWorkKey of meetingToolWorkMap.keys()) {
		var nodeKeys = meetingToolWorkMap.get(meetingToolWorkKey)
		if (nodeKeys.length == 1) {
			meetingToolWorkMap.set(meetingToolWorkKey, nodeKeys[0])
		}
		else {
			nodeKeys.sort()
			meetingToolWorkMap.set(meetingToolWorkKey, nodeKeys[1])
			meetingToolWorkEntries.push([nodeKeys[0], nodeKeys[1]])
		}
	}
	for (var meetingToolWorkEntry of meetingToolWorkEntries) {
		meetingToolWorkMap.set(meetingToolWorkEntry[0], meetingToolWorkEntry[1])
	}
	console.log('meetingToolWorkMap')
	console.log(meetingToolWorkMap)
	console.log('extantPolygons')
	console.log(extantPolygons)
	for (var extantPolygon of extantPolygons) {
		console.log('extantPolygon')
		console.log(extantPolygon.slice(0))
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeStrings = extantPolygon[nodeStringIndex].split(',')
			var nodeKey = nodeStrings[0] + ',' + nodeStrings[1]
			if (meetingToolWorkMap.has(nodeKey)) {
				extantPolygon[nodeStringIndex] = meetingToolWorkMap.get(nodeKey)
			}
		}
		console.log(extantPolygon.slice(0))
		console.log('extantPolygon.length')
		console.log(extantPolygon.length)
		removeRepeats(extantPolygon)
		console.log(extantPolygon.length)
		console.log(extantPolygon.slice(0))
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeStrings = extantPolygon[nodeStringIndex].split(',')
			var nodeIndex = parseInt(nodeStrings[1])
			if (nodeStrings[0] == 't') {
				extantPolygon[nodeStringIndex] = toolPolygon[nodeIndex]
			}
			else {
				if (nodeStrings[0] == 'w') {
					extantPolygon[nodeStringIndex] = workPolygon[nodeIndex]
				}
				else {
					extantPolygon[nodeStringIndex] = meetings[nodeIndex].point
				}
			}
		}
	}
*/
	for (var extantPolygon of extantPolygons) {
		removeRepeats(extantPolygon)
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeStrings = extantPolygon[nodeStringIndex].split(',')
			var nodeIndex = parseInt(nodeStrings[1])
			if (nodeStrings[0] == 't') {
				extantPolygon[nodeStringIndex] = toolPolygon[nodeIndex]
			}
			else {
				if (nodeStrings[0] == 'w') {
					extantPolygon[nodeStringIndex] = workPolygon[nodeIndex]
				}
				else {
					extantPolygon[nodeStringIndex] = meetings[nodeIndex].point
				}
			}
		}
	}
	return extantPolygons
}

function getOperatorDirectedPolygon(isWorkClockwise, operator, toolPolygon) {
	if (operator[0] == 'd') {
		return getDirectedPolygon(!isWorkClockwise, toolPolygon)
	}
	return getDirectedPolygon(isWorkClockwise, toolPolygon)
}

function getPlaneByNormal(normal) {
	var furthestAxis = [1.0, 0.0, 0.0]
	var smallestDotProduct = Math.abs(getXYZDotProduct(normal, furthestAxis))
	var yAxis = [0.0, 1.0, 0.0]
	var dotProduct = Math.abs(getXYZDotProduct(normal, yAxis))
	if (dotProduct < smallestDotProduct) {
		smallestDotProduct = dotProduct
		furthestAxis = yAxis
	}
	var zAxis = [0.0, 0.0, 1.0]
	dotProduct = Math.abs(getXYZDotProduct(normal, zAxis))
	if (dotProduct < smallestDotProduct) {
		furthestAxis = zAxis
	}
	var xBasis = getCrossProduct(normal, furthestAxis)
	divideXYZByScalar(xBasis, getXYZLength(xBasis))
	return [xBasis, getCrossProduct(normal, xBasis)]
}

function getPointsByString(pointString) {
	if (pointString == '') {
		return []
	}
	var parameterStrings = pointString.split(' ')
	for (parameterIndex = 0; parameterIndex < parameterStrings.length; parameterIndex++) {
		parameterStrings[parameterIndex] = parameterStrings[parameterIndex].split(',').map(parseFloat)
	}
	return parameterStrings
}

function getPointInsidePolygon(polygon) {
	if (getIsEmpty(polygon)) {
		return null
	}
	var maximumY = -Number.MAX_VALUE
	var minimumY = Number.MAX_VALUE
	for (var point of polygon) {
		maximumY = Math.max(maximumY, point[1])
		minimumY = Math.min(minimumY, point[1])
	}
	var midX = null
	var midY = 0.5 * (minimumY + maximumY)
	var xIntersections = []
	addXIntersectionsByPolygon(xIntersections, polygon, midY)
	var greatestWidth = -Number.MAX_VALUE
	for (var intersectionIndex = 0; intersectionIndex < xIntersections.length; intersectionIndex += 2) {
		var nextIndex = intersectionIndex + 1
		if (nextIndex < xIntersections.length) {
			var beginX = xIntersections[intersectionIndex]
			var endX = xIntersections[nextIndex]
			var width = endX - beginX
			if (width > greatestWidth) {
				greatestWidth = width
				midX = 0.5 * (beginX + endX)
			}
		}
	}
	if (midX == null) {
		return null
	}
	return [midX, midY]
}

function getPolygonArea(polygon) {
	return 0.5 * getDoublePolygonArea(polygon)
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

function getPolygonInsideness(point, polygon) {
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		if (getIsXYSegmentClose(polygon[pointIndex], polygon[(pointIndex + 1) % polygon.length], point)) {
			return 0
		}
	}
	if (getIsPointInsidePolygon(point, polygon)) {
		return 1
	}
	return -1
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

function getPolygonRotated(polygon, rotation) {
	var polygonRotated = new Array(polygon.length)
	for (var keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		polygonRotated[keyIndex] = polygon[(keyIndex + rotation) % polygon.length]
	}
	return polygonRotated
}

function getPolygonsByArrowMap(arrowMap, pointMap) {
	var polygons = addFacetsByArrowMap(arrowMap, [])
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
				if (keys.length > gLengthLimit) {
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

function removeCollinearXYPoints(polygon) {
	removeIdenticalXYPoints(polygon)
	var nullIndexSet = new Set()
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerBegin = getXYSubtraction(beginPoint, centerPoint)
		var centerBeginLength = getXYLength(centerBegin)
		var centerEnd = getXYSubtraction(endPoint, centerPoint)
		var centerEndLength = getXYLength(centerEnd)
		divideXYByScalar(centerBegin, centerBeginLength)
		divideXYByScalar(centerEnd, centerEndLength)
		if (Math.abs(getXYDotProduct(centerBegin, centerEnd)) > gOneMinusClose) {
			nullIndexSet.add(vertexIndex)
		}
	}
	removeNullsBySet(polygon, nullIndexSet)
}

function removeIdenticalXYPoints(polygon) {
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = polygon[vertexIndex]
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		if (point[0] == nextPoint[0] && point[1] == nextPoint[1]) {
			polygon.splice(vertexIndex, 1)
		}
	}
}

function removeMeetings(alongIndexesMap, meetingRemovalSet) {
	var indexRemovalSet = new Set()
	for (var alongIndexesEntry of alongIndexesMap) {
		var alongIndexes = alongIndexesEntry[1]
		for (var index = alongIndexes.length - 1; index > -1; index--) {
			if (meetingRemovalSet.has(alongIndexes[index][1])) {
				alongIndexes.splice(index, 1)
			}
		}
		if (alongIndexes.length == 0) {
			indexRemovalSet.add(alongIndexesEntry[0])
		}
	}
	for (var indexRemoval of indexRemovalSet) {
		alongIndexesMap.delete(indexRemoval)
	}
}

function removeIdenticalXYPoints(polygon) {
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = polygon[vertexIndex]
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		if (point[0] == nextPoint[0] && point[1] == nextPoint[1]) {
			polygon.splice(vertexIndex, 1)
		}
	}
}

function rotateXYZParametersByPoints(rotation, pointList) {
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
		rotateXYZParametersByPoints(rotation, pointList)
	}
}

function setClosestSquared(closestSquared, gridMap, key, point) {
	if (gridMap.has(key)) {
		var otherPoints = gridMap.get(key)
		for (var otherPoint of otherPoints) {
			var xyDistanceSquared = getXYDistanceSquared(point, otherPoint)
			if (closestSquared[0] == null) {
				closestSquared[0] = otherPoint
				closestSquared[1] = xyDistanceSquared
			}
			else {
				if (xyDistanceSquared < closestSquared[1]) {
					closestSquared[0] = otherPoint
					closestSquared[1] = xyDistanceSquared
				}
			}
		}
	}
}

function setClosestSquaredByXY(closestSquared, gridMap, gridX, gridY, point) {
	setClosestSquared(closestSquared, gridMap, gridX.toString() + ' ' + gridY.toString(), point)
}

function setLinkTop(key, linkMap, top) {
	for (var keyIndex = 0; keyIndex < gLengthLimit; keyIndex++) {
		if (key == top) {
			return
		}
		var nextKey = null
		if (linkMap.has(key)) {
			nextKey = linkMap.get(key)
		}
		linkMap.set(key, top)
		if (nextKey == null) {
			return
		}
		key = nextKey
	}
	warningByList(['In setLinkTop keyIndex = 9876543', key, linkMap, top])
}

function sortRemoveMeetings(alongIndexesMap) {
	var meetingRemovalSet = new Set()
	addToMeetingRemoval(alongIndexesMap, meetingRemovalSet)
	removeMeetings(alongIndexesMap, meetingRemovalSet)
}

function swapXYPoint(xyPoint) {
	var x = xyPoint[0]
	xyPoint[0] = xyPoint[1]
	xyPoint[1] = x
}

function swapXYPolygon(xyPolygon) {
	for (var xyPoint of xyPolygon) {
		swapXYPoint(xyPoint)
	}
}

function swapXYPolygons(xyPolygons) {
	for (var xyPolygon of xyPolygons) {
		swapXYPolygon(xyPolygon)
	}
}

function xyPointIsCloseToPoints(point, xyPoints) {
	for (var xyPoint of xyPoints) {
		if (getXYDistanceSquared(point, xyPoint) < gCloseSquared) {
			return true
		}
	}
	return false
}
