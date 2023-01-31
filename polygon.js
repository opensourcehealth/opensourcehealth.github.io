//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gDifferenceExclusion = {toolExclusion:-1, workExclusion:1, workExclusionSet:new Set([1, 0])}
var gIntersectionExclusion = {toolExclusion:-1, workExclusion:-1, workExclusionSet:new Set([-1])}
var gUnionExclusion = {toolExclusion:1, workExclusion:1, workExclusionSet:new Set([1])}

/*
//deprecated
function addExtantPolygons(extantPolygons, nodeMaps, originalNodeMapIndex, startException, turnRight) {
	var defaultProximity = -9
	if (turnRight) {
		defaultProximity = -defaultProximity
	}
	var originalMap = nodeMaps[originalNodeMapIndex]
	for (var nodeKey of originalMap.keys()) {
		var nodeStrings = nodeKey.split(' ')
		var operatingNode = originalMap.get(nodeKey)
		if (nodeStrings[0] != startException && operatingNode != null) {
			var extantPolygon = []
			var firstKey = nodeKey
			var nodeMapIndex = originalNodeMapIndex
			var operatingMap = originalMap
			for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
				extantPolygon.push(nodeKey)
				var oldNode = operatingNode
				operatingNode = operatingMap.get(nodeKey)
				var nodeStrings = nodeKey.split(' ')
				if (nodeStrings[0] == 'm') {
					var alternateProximity = defaultProximity
					var centerBegin = null
					var operatingProximity = defaultProximity
					centerBegin = getSubtraction2D(oldNode.point, oldNode.nextPoint)
					centerBeginLength = length2D(centerBegin)
					if (centerBeginLength == 0.0) {
						centerBegin = null
					}
					else {
						divide2DScalar(centerBegin, centerBeginLength)
					}
					var alternateNodeIndex = 1 - nodeMapIndex
					var alternateMap = nodeMaps[alternateNodeIndex]
					var alternateNode = alternateMap.get(nodeKey)
					if (centerBegin != null) {
						if (alternateNode != null) {
							var centerAlternate = getSubtraction2D(alternateNode.nextPoint, alternateNode.point)
							var centerAlternateLength = length2D(centerAlternate)
							if (centerAlternateLength == 0.0) {
								console.log(alternateNode)
								console.log(extantPolygons)
								console.log(nodeMaps)
							}
							else {
								divide2DScalar(centerAlternate, centerAlternateLength)
								alternateProximity = getDirectionalProximity(centerBegin, centerAlternate)
							}
						}
						if (operatingNode != null) {
							var centerOperating = getSubtraction2D(operatingNode.nextPoint, operatingNode.point)
							var centerOperatingLength = length2D(centerOperating)
							if (centerOperatingLength == 0.0) {
//								console.log(operatingNode)
//								console.log(extantPolygons)
//								console.log(nodeMaps)
							}
							else {
								divide2DScalar(centerOperating, centerOperatingLength)
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
*/

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

function addMeetingsByPolygon(alongIndexesMap, meetingMap, toolPolygon, workPolygon) {
	var xMap = new Map()
	for (var toolBeginIndex = 0; toolBeginIndex < toolPolygon.length; toolBeginIndex++) {
		var arrowMap = new Map()
		var toolEndIndex = (toolBeginIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolBeginIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = getSubtraction2D(toolEnd, toolBegin)
		var deltaLength = length2D(delta)
		if (deltaLength != 0.0) {
			divide2DScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = getRotation2DVector(toolBegin, reverseRotation)
			var toolEndRotated = getRotation2DVector(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			var workPolygonRotated = getRotations2DVector(workPolygon, reverseRotation)
			for (var workBeginIndex = 0; workBeginIndex < workPolygon.length; workBeginIndex++) {
				var workEndIndex = (workBeginIndex + 1) % workPolygon.length
				var meeting = null
				var meetingKey = workPolygon[workBeginIndex] + ';' + workPolygon[workEndIndex] + ';' + toolBeginIndex
				var workDirection = true
				var reversedKey = workPolygon[workEndIndex] + ';' + workPolygon[workBeginIndex]
				if (arrowMap.has(reversedKey)) {
					meetingKey = reversedKey + ';' + toolBeginIndex
					meeting = meetingMap.get(meetingKey)
					workDirection = false
				}
				else {
					var workBeginRotated = workPolygonRotated[workBeginIndex]
					var workEndRotated = workPolygonRotated[workEndIndex]
					meeting = getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated)
				}
				if (meeting != null) {
					var toolAlong = meeting.toolAlong
					var workAlong = meeting.workAlong
					if (workDirection) {
						if (meeting.isWorkNode) {
							if (meeting.workAlong < 0.5) {
								meeting.point = workPolygon[workBeginIndex]
							}
							else {
								meeting.point = workPolygon[workEndIndex]
							}
						}
						else {
							if (meeting.isToolNode) {
								if (meeting.toolAlong < 0.5) {
									meeting.point = toolBegin
								}
								else {
									meeting.point = toolEnd
								}
								var xKey = meeting.point
								if (xMap.has(xKey)) {
									meetingKey = xMap.get(xKey)
									meeting = meetingMap.get(meetingKey)
								}
								else {
									xMap.set(xKey, meetingKey)
								}
							}
							else {
								meeting.point = getMultiplicationArrayScalar(workPolygon[workBeginIndex], 1.0 - meeting.workAlong)
								addArray(meeting.point, getMultiplicationArrayScalar(workPolygon[workEndIndex], meeting.workAlong))
							}
						}
						arrowMap.set(workPolygon[workBeginIndex] + ';' + workPolygon[workEndIndex], meetingKey)
						meetingMap.set(meetingKey, meeting)
					}
					else {
						workAlong = 1.0 - workAlong
					}
					addMeetingToMap(
						toolAlong,
						alongIndexesMap,
						meeting.isToolNode,
						't ',
						meetingKey,
						toolBeginIndex,
						toolPolygon.length)
					addMeetingToMap(
						workAlong,
						alongIndexesMap,
						meeting.isWorkNode,
						'w ',
						meetingKey,
						workBeginIndex,
						workPolygon.length)
				}
			}
		}
	}
}

function addMeetingToMap(along, alongIndexesMap, isNode, keyStart, meetingsLength, vertexIndex, polygonLength) {
	if (isNode) {
		if (along < 0.5) {
			addElementToMapArray([0.0, meetingsLength], keyStart + vertexIndex.toString(), alongIndexesMap)
		}
		else {
			addElementToMapArray([0.0, meetingsLength], keyStart + ((vertexIndex + 1) % polygonLength).toString(), alongIndexesMap)
		}
		return
	}
	addElementToMapArray([along, meetingsLength], keyStart + vertexIndex.toString(), alongIndexesMap)
}

function addPointIndexToGridMapArray(gridMap, halfMinusOverRadius, point, pointIndex) {
	var key = Math.round(point[0] * halfMinusOverRadius).toString() + ' ' + Math.round(point[1] * halfMinusOverRadius).toString()
	addElementToMapArray(pointIndex, key, gridMap)
}

function addToLinkMap(indexA, indexB, linkMap) {
	var top = Math.max(getLinkTopOnly(indexA, linkMap), getLinkTopOnly(indexB, linkMap))
	setLinkTop(indexA, linkMap, top)
	setLinkTop(indexB, linkMap, top)
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

function addXIntersectionsByPolylineClose(xIntersections, xyPolyline, y) {
	addXIntersectionsByPolyline(xIntersections, xyPolyline, y - gClose)
	addXIntersectionsByPolyline(xIntersections, xyPolyline, y + gClose)
}

function addXIntersectionsBySegment(begin, end, xIntersections, y) {
//	if ((begin[1] == y) && (end[1] == y)) {
//		xIntersections.push(begin[0])
//		xIntersections.push(end[0])
//	}
//	else {
	if ((begin[1] < y) != (end[1] < y)) {
		var beginPortion = (end[1] - y) / (end[1] - begin[1])
		xIntersections.push(beginPortion * begin[0] + (1.0 - beginPortion) * end[0])
	}
//	}
}

function convert2DPolygonsTo3D(xyPolygons, z) {
	for (polygonIndex = 0; polygonIndex < xyPolygons.length; polygonIndex++) {
		xyPolygons[polygonIndex] = getPolygon3D(xyPolygons[polygonIndex], z)
	}
	return xyPolygons
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

function convertPointStringsToPointLists(pointStrings) {
	for (stringIndex = 0; stringIndex < pointStrings.length; stringIndex++) {
		pointStrings[stringIndex] = getPointsByString(pointStrings[stringIndex])
	}
	return pointStrings
}

function convertSegmentArraysToKeyArrays(segmentArrays) {
	for (var segments of segmentArrays) {
		for (var segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
			segments[segmentIndex] = segments[segmentIndex][0].nodeKey
		}
	}
}

function directPolygonGroup(polygonGroup) {
	if (polygonGroup.length < 2) {
		return
	}
	var isClockwise = getIsClockwise(polygonGroup[0])
	for (var polygonIndex = 1; polygonIndex < polygonGroup.length; polygonIndex++) {
		if (getIsClockwise(polygonGroup[polygonIndex]) == isClockwise) {
			polygonGroup[polygonIndex].reverse()
		}
	}
}

function getBoundingBox(polygon) {
	if (getIsEmpty(polygon)) {
		return null
	}
	var boundingBox = [polygon[0].slice(0, 2), polygon[0].slice(0, 2)]
	for (var pointIndex = 1; pointIndex < polygon.length; pointIndex++) {
		widenBoundingBox(boundingBox, polygon[pointIndex])
	}
	return boundingBox
}

function getBoundingXByPolygons(polygons) {
	if (getIsEmpty(polygons)) {
		return null
	}
	var polygonZero = polygons[0]
	if (getIsEmpty(polygonZero)) {
		return null
	}
	var x = polygonZero[0][0]
	var boundingX = [x, x]
	for (var polygon of polygons) {
		for (var point of polygon) {
			x = point[0]
			boundingX[0] = Math.min(boundingX[0], x)
			boundingX[1] = Math.max(boundingX[1], x)
		}
	}
	return boundingX
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

//deprecated23 should be replaced by getClosePointIndexOrNull followed by addPointIndexToGridMapArray if null
function getClosePointIndex(gridMap, point, points) {
	var floorX = Math.floor(point[0] * gHalfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * gHalfMinusOver)
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
	gridMap.set(Math.round(point[0] * gHalfMinusOver).toString() + ' ' + Math.round(point[1] * gHalfMinusOver).toString(), pointsLength)
	points.push(point)
	return pointsLength
}

function getClosePointIndexOrNull(gridMap, point, points) {
	var floorX = Math.floor(point[0] * gHalfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * gHalfMinusOver)
	var floorYPlus = floorY + 2
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				var pointIndexes = gridMap.get(key)
				var closestIndex = pointIndexes[0]
				if (pointIndexes.length == 1) {
					return closestIndex
				}
				var leastDistanceSquared = distanceSquared2D(point, points[pointIndexes[0]])
				for (var pointIndexIndex = 1; pointIndexIndex < pointIndexes.length; pointIndexIndex++) {
					var pointIndex = pointIndexes[pointIndexIndex]
					var distanceSquared = distanceSquared2D(point, points[pointIndex])
					if (distanceSquared < leastDistanceSquared) {
						closestIndex = pointIndex
						leastDistanceSquared = distanceSquared
					}
				}
				return closestIndex
			}
		}
	}
	return null
}

function getConnectedSegmentArrays(toolPolygonSegments, workPolygonSegments) {
	if (workPolygonSegments.length < 3) {
		return []
	}
	var startIndex = getStartIndex(workPolygonSegments)
	if (startIndex == null) {
		if (workPolygonSegments[0] == null) {
			return []
		}
		return [workPolygonSegments]
	}
	var segmentArrays = getSegmentArrays(workPolygonSegments, startIndex)
	var toolNodeMap = new Map()
	for (var segmentIndex = 0; segmentIndex < toolPolygonSegments.length; segmentIndex++) {
		var toolPolygonSegment = toolPolygonSegments[segmentIndex]
		if (toolPolygonSegment != null) {
			toolNodeMap.set(toolPolygonSegment[0].nodeKey, segmentIndex)
		}
	}
	var endMap = new Map()
	for (var segmentIndex = 0; segmentIndex < segmentArrays.length; segmentIndex++) {
		endMap.set(segmentArrays[segmentIndex][0][0].nodeKey, segmentIndex)
	}
	var workSegmentArrays = []
	for (var segmentIndex = 0; segmentIndex < segmentArrays.length; segmentIndex++) {
		var segments = segmentArrays[segmentIndex]
		var nodeBeginKey = segments[segments.length - 1][1].nodeKey
		connectionSegments = getConnectionSegments(endMap, nodeBeginKey, toolNodeMap, toolPolygonSegments)
		if (connectionSegments != null) {
			segmentArrays[segmentIndex] = null
			var nodeEndKey = segments[0][0].nodeKey
			pushArray(segments, connectionSegments.segments)
			if (connectionSegments.nodeKey == segmentIndex) {
				workSegmentArrays.push(segments)
				if (segments.length < 3) {
//					noticeByList(
//					['segments is shorter than 3 in getConnectedSegmentArrays in polygon.', segments, segmentArrays, segmentIndex])
				}
				endMap.delete(nodeEndKey)
			}
			else {
				pushArray(segments, segmentArrays[connectionSegments.nodeKey])
				segmentArrays[connectionSegments.nodeKey] = segments
				endMap.set(nodeEndKey, connectionSegments.nodeKey)
			}
		}
	}
	for (var segments of segmentArrays) {
		if (segments != null) {
			noticeByList(['segments are not null in getConnectedSegmentArrays in polygon.', segments, segmentArrays])
			workSegmentArrays.push(segments)
		}
	}
	return workSegmentArrays
}

function getConnectionSegments(endMap, nodeBeginKey, toolNodeMap, toolPolygonSegments) {
	if (!toolNodeMap.has(nodeBeginKey)) {
		return null
	}
	var connectionSegments = []
	var startIndex = toolNodeMap.get(nodeBeginKey)
	for (var extraIndex = 0; extraIndex < toolPolygonSegments.length; extraIndex++) {
		var segmentIndex = (startIndex + extraIndex) % toolPolygonSegments.length
		var toolPolygonSegment = toolPolygonSegments[segmentIndex]
		if (toolPolygonSegment == null) {
			return null
		}
		connectionSegments.push(toolPolygonSegment)
		var toolKey = toolPolygonSegment[1].nodeKey
		if (endMap.has(toolKey)) {
			return {nodeKey:endMap.get(toolKey), segments:connectionSegments}
		}
	}
	return null
}

function getCrossProductByPolygon(polygon) {
	removeIdentical3DPoints(polygon)
	var product = [0.0, 0.0, 0.0]
	if (polygon.length < 3) {
		return product
	}
	var center = polygon[0]
	var oldVector = getSubtraction3D(polygon[1], center)
	var vector = null
	for (var vertexIndex = 2; vertexIndex < polygon.length; vertexIndex++) {
		vector = getSubtraction3D(polygon[vertexIndex], center)
		add3D(product, crossProduct(oldVector, vector))
		oldVector = vector
	}
	return product
}

function getDifferencePolygons(toolPolygon, workPolygon) {
	var isWorkClockwise = getIsClockwise(workPolygon)
	return getOperatedPolygonsByExclusion(gDifferenceExclusion, getDirectedPolygon(!isWorkClockwise, toolPolygon), workPolygon)
}

function getDifferencePolygonsByPolygons(toolPolygons, workPolygons) {
	for (var toolPolygon of toolPolygons) {
		var differencePolygons = []
		for (var workPolygon of workPolygons) {
			pushArray(differencePolygons, getDifferencePolygons(toolPolygon, workPolygon))
		}
		workPolygons = differencePolygons
	}
	return workPolygons
}

function getDirectedPolygon(clockwise, polygon) {
	if (getIsClockwise(polygon) == clockwise) {
		return polygon
	}
	return polygon.slice(0).reverse()
}

function getDistanceToLine(begin, end, point) {
	var delta = getSubtraction2D(end, begin)
	var deltaLength = length2D(delta)
	if (deltaLength == 0.0) {
		return distance2D(begin, point)
	}
	divide2DScalar(delta, deltaLength)
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

function getExtantPolygons(alongIndexesMap, exclusion, isVertical, meetingMap, toolPolygon, workPolygon) {
	var toolPolygonSegments = getPolygonSegments(alongIndexesMap, meetingMap, toolPolygon, 't')
	var workPolygonSegments = getPolygonSegments(alongIndexesMap, meetingMap, workPolygon, 'w')
	for (var segmentIndex = toolPolygonSegments.length - 1; segmentIndex > -1; segmentIndex--) {
		var toolPolygonSegment = toolPolygonSegments[segmentIndex]
		if (toolPolygonSegment[0].nodeKey == toolPolygonSegment[1].nodeKey) {
			toolPolygonSegments.splice(segmentIndex, 1)
		}
	}
	if (isVertical) {
		for (var segmentIndex = toolPolygonSegments.length - 1; segmentIndex > -1; segmentIndex--) {
			var toolPolygonSegment = toolPolygonSegments[segmentIndex]
			var nodeBegin = toolPolygonSegment[0]
			var nodeEnd = toolPolygonSegment[1]
			if (nodeBegin.nodeKey[0] == 'm' && nodeEnd.nodeKey[0] == 'm') {
				if (nodeBegin.nodeKey != nodeEnd.nodeKey) {
					if (nodeBegin.point[0] == nodeEnd.point[0] && nodeBegin.point[1] == nodeEnd.point[1]) {
						var reversedSegment = [toolPolygonSegment[1], toolPolygonSegment[0]]
						toolPolygonSegments.splice(segmentIndex + 1, 0, reversedSegment)
					}
				}
			}
		}
	}
	nullifyExcludedPoints(exclusion.toolExclusion, workPolygon, toolPolygonSegments)
	nullifyExcludedMidpoints(new Set([exclusion.toolExclusion]), workPolygon, toolPolygonSegments)
	nullifyExcludedPoints(exclusion.workExclusion, toolPolygon, workPolygonSegments)
	nullifyExcludedMidpoints(exclusion.workExclusionSet, toolPolygon, workPolygonSegments)
	var connectedSegmentArrays = getConnectedSegmentArrays(toolPolygonSegments, workPolygonSegments)
	convertSegmentArraysToKeyArrays(connectedSegmentArrays)
	return connectedSegmentArrays
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
		addElementToMapArray(point, key, gridMap)
	}
	return gridMultiplier
}

function getHolePolygons(innerLeft, innerRight, outerBottom, outerTopRight, overhangAngle, thickness, width) {
	var deltaZMinus = outerTopRight[1] - thickness - outerBottom
	var minimumQuadrilateralExtra = 0.5 * thickness
	var minimumPolygonExtra = minimumQuadrilateralExtra - 0.5 * thickness
	var innerWidth = innerRight - innerLeft
	var innerWidthPlus = innerWidth + thickness
	var minimumPolygonLength = 0
	var numberOfHorizontals = 1
	var numberOfVerticals = 1
	if (width < innerWidth) {
		numberOfHorizontals = Math.ceil(innerWidthPlus / width)
	}
	var diamondWidth = innerWidthPlus / numberOfHorizontals
	var diamondInnerWidth = diamondWidth - thickness
	var holePolygons = []
	var slope = Math.cos(overhangAngle) / Math.sin(overhangAngle)
	var diamondInnerHeight = diamondInnerWidth * slope
	var diamondHeight = diamondInnerHeight + thickness
	if (diamondHeight > deltaZMinus) {
		diamondHeight = deltaZMinus
		diamondInnerHeight = diamondHeight - thickness
		numberOfHorizontals = Math.ceil(innerWidthPlus / (diamondInnerHeight / slope + thickness))
		diamondWidth = innerWidthPlus / numberOfHorizontals
		diamondInnerWidth = diamondWidth - thickness
	}
	else {
		numberOfVerticals = Math.floor(deltaZMinus / diamondHeight)
		diamondHeight = deltaZMinus / numberOfVerticals
		diamondInnerHeight = diamondHeight - thickness
	}
	var minimumSize = 0.1 * thickness
	if (diamondInnerHeight < minimumSize || diamondInnerWidth < minimumSize) {
		return []
	}
	var hypoteneuse = thickness * Math.sqrt(diamondInnerWidth * diamondInnerWidth + diamondInnerHeight * diamondInnerHeight)
	var thicknessX = hypoteneuse / diamondInnerHeight
	var thicknessZ = hypoteneuse / diamondInnerWidth
	var diamondBottom = outerBottom + thickness
	var diamondTop = diamondBottom + diamondInnerHeight
	var diamondCenterZ = 0.5 * (diamondBottom + diamondTop)
	var startRight = innerLeft + diamondInnerWidth
	var startCenterX = 0.5 * (innerLeft + startRight)
	for (var verticalIndex = 0; verticalIndex < numberOfVerticals; verticalIndex++) {
		var diamondLeft = innerLeft
		var diamondRight = startRight
		var diamondCenterX = startCenterX
		var polygonTop = diamondCenterZ - thicknessZ
		var polygonExtra = polygonTop - diamondBottom
		minimumPolygonLength = Math.max(minimumPolygonLength, 5 * (polygonExtra < minimumQuadrilateralExtra))
		minimumPolygonLength = Math.max(minimumPolygonLength, 9 * (polygonExtra < minimumPolygonExtra))
		var polygonBelow = diamondBottom - thickness
		var polygonBottom = diamondBottom + diamondBottom - polygonTop - thickness
		var rightSide = null
		for (var horizontalIndex = 0; horizontalIndex < numberOfHorizontals; horizontalIndex++) {
			var diamondHole = [
			[diamondLeft, diamondCenterZ], [diamondCenterX, diamondTop], [diamondRight, diamondCenterZ], [diamondCenterX, diamondBottom]]
			holePolygons.push(diamondHole)
			var polygonLeft = diamondCenterX + thicknessX
			var polygonRight = diamondCenterX - thicknessX
			var polygonExtra = polygonRight - diamondLeft
			minimumPolygonLength = Math.max(minimumPolygonLength, 5 * (polygonExtra < minimumQuadrilateralExtra))
			minimumPolygonLength = Math.max(minimumPolygonLength, 9 * (polygonExtra < minimumPolygonExtra))
			var leftSide = [[diamondLeft, polygonTop], [polygonRight, diamondBottom]]
			if (verticalIndex == 0) {
				if (rightSide == null) {
					leftSide.push([diamondLeft, diamondBottom])
				}
				else {
					pushArray(leftSide, rightSide)
				}
				rightSide = [[polygonLeft, diamondBottom], [diamondRight, polygonTop]]
			}
			else {
				leftSide.push([polygonRight, polygonBelow])
				leftSide.push([diamondLeft, polygonBottom])
				if (rightSide != null) {
					pushArray(leftSide, rightSide)
				}
				rightSide = [
				[diamondRight, polygonBottom], [polygonLeft, polygonBelow], [polygonLeft, diamondBottom], [diamondRight, polygonTop]]
			}
			if (leftSide.length > minimumPolygonLength) {
				holePolygons.push(leftSide)
			}
			diamondCenterX += diamondWidth
			diamondLeft += diamondWidth
			diamondRight += diamondWidth
		}
		if (verticalIndex == 0) {
			rightSide.push([diamondRight - diamondWidth, diamondBottom])
		}
		if (rightSide.length > minimumPolygonLength) {
			holePolygons.push(rightSide)
		}
		diamondBottom += diamondHeight
		diamondCenterZ += diamondHeight
		diamondTop += diamondHeight
	}
	return holePolygons
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
	var insetDelta = getAddition2D(centerBegin, centerEnd)
	var endRight = [centerEnd[1], -centerEnd[0]]
	var dotProductPerpendicular = dotProduct2D(endRight, insetDelta)
	if (dotProductPerpendicular == 0.0) {
		return endRight
	}
	return divide2DScalar(insetDelta, dotProductPerpendicular)
}

function getIntercircleLoops(points, radius) {
	removeClose2DPoints(points)
	var bigMap = new Map()
	var bigRadius = 1.5 * radius
	var diameter = radius + radius
	var diameterMap = new Map()
	var diameterSquared = diameter * diameter
	var distantIndexes = []
	var gridMap = new Map()
	var intercircles = new Array(points.length)
	var intercircleLoops = []
	var intersections = []
	var intersectionSet = new Set()
	var linkSet = new Set()
	var radiusSquared = radius * radius
	var bigRadiusSquared = bigRadius * bigRadius
	var minusOverBig = 0.499 / bigRadius
	var minusOverDiameter = 0.499 / diameter
	var minusOverRadius = 0.499 / radius
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		addPointIndexToGridMapArray(bigMap, minusOverBig, point, pointIndex)
		addPointIndexToGridMapArray(gridMap, minusOverRadius, point, pointIndex)
	}
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var otherIndexes = getPointIndexesInCircle(diameterMap, minusOverDiameter, point, points, diameterSquared)
		addPointIndexToGridMapArray(diameterMap, minusOverDiameter, point, pointIndex)
		for (var otherIndex of otherIndexes) {
			var other = points[otherIndex]
			var distanceSquared = distanceSquared2D(point, other)
			var pointOther = getSubtraction2D(point, other)
			var pointOtherLength = Math.sqrt(distanceSquared)
			var rightLength = Math.sqrt(radiusSquared - 0.25 * distanceSquared)
			var furtherLength = Math.sqrt(bigRadiusSquared - 0.25 * distanceSquared)
			var between = multiply2DScalar(getAddition2D(point, other), 0.5)
			var right = [pointOther[1], -pointOther[0]]
			var intersectionPoint = getAddition2D(between, getMultiplication2DScalar(right, rightLength / pointOtherLength))
			linkSet.clear()
			linkSet.add(pointIndex)
			linkSet.add(otherIndex)
			if (isPointOutsideOrBorderingCircles(gridMap, minusOverRadius, linkSet, intersectionPoint, points, radiusSquared)) {
				var difference = getSubtraction2D(intersectionPoint, point)
				addElementToArrays(intercircles, pointIndex, [getRelativeDirection(difference), intersections.length])
				difference = getSubtraction2D(intersectionPoint, other)
				addElementToArrays(intercircles, otherIndex, [getRelativeDirection(difference), intersections.length])
				var further = getAddition2D(between, getMultiplication2DScalar(right, furtherLength / pointOtherLength))
				if (isPointOutsideOrBorderingCircles(bigMap, minusOverBig, linkSet, further, points, bigRadiusSquared)) {
					distantIndexes.push(intersections.length)
				}
				intersections.push(otherIndex)
			}
			intersectionPoint = getAddition2D(between, getMultiplication2DScalar(right, -rightLength / pointOtherLength))
			if (isPointOutsideOrBorderingCircles(gridMap, minusOverRadius, linkSet, intersectionPoint, points, radiusSquared)) {
				var difference = getSubtraction2D(intersectionPoint, point)
				addElementToArrays(intercircles, pointIndex, [getRelativeDirection(difference), intersections.length])
				difference = getSubtraction2D(intersectionPoint, other)
				addElementToArrays(intercircles, otherIndex, [getRelativeDirection(difference), intersections.length])
				var further = getAddition2D(between, getMultiplication2DScalar(right, -furtherLength / pointOtherLength))
				if (isPointOutsideOrBorderingCircles(bigMap, minusOverBig, linkSet, further, points, bigRadiusSquared)) {
					distantIndexes.push(intersections.length)
				}
				intersections.push(pointIndex)
			}
		}
	}
	for (var intercircleIndex = 0; intercircleIndex < intercircles.length; intercircleIndex++) {
		var intercircle = intercircles[intercircleIndex]
		if (intercircle != undefined) {
			intercircle.sort(compareFirstElementAscending)
			for (var linkIndex = 0; linkIndex < intercircle.length; linkIndex++) {
				intercircle[linkIndex] = intercircle[linkIndex][1]
			}
		}
	}
	for (var distantIndex of distantIndexes) {
		if (!intersectionSet.has(distantIndex)) {
			var intercircleLoop = []
			var nextIndex = distantIndex
			do {
				var intercircleIndex = intersections[nextIndex]
				var intercircle = intercircles[intercircleIndex]
				intersectionSet.add(nextIndex)
				intercircleLoop.push(points[intercircleIndex])
				for (var linkIndex = 0; linkIndex < intercircle.length; linkIndex++) {
					if (intercircle[linkIndex] == nextIndex) {
						nextIndex = intercircle[(linkIndex + 1) % intercircle.length]
						break
					}
				}
			}
			while (!intersectionSet.has(nextIndex))
			if (intercircleLoop.length > 1) {
				removeCollinearXYPoints(intercircleLoop)
				intercircleLoops.push(intercircleLoop)
			}
		}
	}
	return intercircleLoops
}

function getIntercircleLoopsByPolylines(polylines, radius) {
	var points = []
	for (var polyline of polylines) {
		// starting at 1 because polygon is a polyline with the beginning point added to the end
		for (var vertexIndex = 1; vertexIndex < polyline.length; vertexIndex++) {
			var vertex = polyline[vertexIndex - 1]
			points.push(vertex)
			var vertexNext = getSubtraction2D(polyline[vertexIndex], vertex)
			var vertexNextLength = length2D(vertexNext)
			if (vertexNextLength > radius) {
				var numberOfDivisions = Math.ceil(vertexNextLength / radius)
				vertex = vertex.slice(0)
				divide2DScalar(vertexNext, numberOfDivisions)
				for (var betweenIndex = 1; betweenIndex < numberOfDivisions; betweenIndex++) {
					add2D(vertex, vertexNext)
					points.push(vertex.slice(0))
				}
			}
		}
		if (polyline.length > 0) {
			points.push(polyline[polyline.length - 1])
		}
	}
	return getIntercircleLoops(points, radius)
}

function getIntersectionPolygons(toolPolygon, workPolygon) {
	var isWorkClockwise = getIsClockwise(workPolygon)
	return getOperatedPolygonsByExclusion(gIntersectionExclusion, getDirectedPolygon(isWorkClockwise, toolPolygon), workPolygon)
}

function getIntersectionPolygonsByPolygons(polygons) {
	if (polygons.length == 0) {
		return []
	}
	var intersectedPolygons = [polygons[0]]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		var operatedPolygons = []
		for (var intersectedPolygon of intersectedPolygons) {
			pushArray(operatedPolygons, getIntersectionPolygons(polygons[polygonIndex], intersectedPolygon))
		}
		intersectedPolygons = operatedPolygons
	}
	return intersectedPolygons
}

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
//					tripleIntersection.belows.sort(compareNumberAscending)
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
	if (workBeginY < splitHeightMinus && workEndY < splitHeightMinus) {
		return true
	}
	var splitHeightPlus = splitHeight + gClose
	return workBeginY > splitHeightPlus && workEndY > splitHeightPlus
}

//deprecated23, to be replaced with area check
function getIsClear(side, sideOther, xIntersections) {
	var minimumX = Math.min(side, sideOther) - gClose
	var maximumX = Math.max(side, sideOther) + gClose
	for (var xIntersection of xIntersections) {
		if (xIntersection > minimumX && xIntersection < maximumX) {
			return false
		}
	}
	return true
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
	xIntersections = []
	addXIntersectionsByPolygon(xIntersections, getSwapped2DPolygon(polygon), point[1])
	var x = point[0]
	swapXYPoint(point)
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
	xIntersections = []
	addXIntersectionsByPolygon(xIntersections, getSwapped2DPolygon(polygon), point[1])
	x = point[0]
	swapXYPoint(point)
	for (var xIntersection of xIntersections) {
		if (Math.abs(xIntersection - x) < gClose) {
			return true
		}
	}
	return getNumberOfIntersectionsToLeft(x, xIntersections) % 2 == 1
}

function getIsPolygonBent(polygon) {
	removeIdentical3DPoints(polygon)
	if (polygon.length < 3) {
		return false
	}
	var center = polygon[0]
	var oldProduct = null
	var oldVector = getSubtraction3D(polygon[1], center)
	for (var vertexIndex = 2; vertexIndex < polygon.length; vertexIndex++) {
		vector = getSubtraction3D(polygon[vertexIndex], center)
		var product = crossProduct(oldVector, vector)
		var productLength = length3D(product)
		if (productLength > 0.0) {
			divide3DScalar(product, productLength)
			if (oldProduct != null) {
				if (Math.abs(dotProduct3D(product, oldProduct)) < gOneMinusClose) {
					return true
				}
			}
			oldProduct = product
		}
		oldVector = vector
	}
	return false
}

function getIsPolygonIntersecting(toolPolygon, workPolygon) {
	var toolBox = getBoundingBox(toolPolygon)
	var workBox = getBoundingBox(workPolygon)
	if (toolBox[1][0] < workBox[0][0] || toolBox[1][1] < workBox[0][1]) {
		return false
	}
	if (toolBox[0][0] > workBox[1][0] || toolBox[0][1] > workBox[1][1]) {
		return false
	}
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
	return getIsPolygonMeeting(toolPolygon, workPolygon)
}

function getIsPolygonIntersectingOrClose(toolPolygon, workPolygon) {
	var toolBox = getBoundingBox(toolPolygon)
	var workBox = getBoundingBox(workPolygon)
	if (toolBox[1][0] + gClose < workBox[0][0] || toolBox[1][1] + gClose < workBox[0][1]) {
		return false
	}
	if (toolBox[0][0] > workBox[1][0] + gClose || toolBox[0][1] > workBox[1][1] + gClose) {
		return false
	}
	for (var point of toolPolygon) {
		if (getIsPointInsidePolygonOrClose(point, workPolygon)) {
			return true
		}
	}
	for (var point of workPolygon) {
		if (getIsPointInsidePolygonOrClose(point, toolPolygon)) {
			return true
		}
	}
	return getIsPolygonMeeting(toolPolygon, workPolygon)
}

function getIsPolygonMeeting(toolPolygon, workPolygon) {
	for (var toolBeginIndex = 0; toolBeginIndex < toolPolygon.length; toolBeginIndex++) {
		var toolEndIndex = (toolBeginIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolBeginIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = getSubtraction2D(toolEnd, toolBegin)
		var deltaLength = length2D(delta)
		if (deltaLength != 0.0) {
			divide2DScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = getRotation2DVector(toolBegin, reverseRotation)
			var toolEndRotated = getRotation2DVector(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			var workPolygonRotated = getRotations2DVector(workPolygon, reverseRotation)
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

function getIsWiddershins(polygon) {
	return getDoublePolygonArea(polygon) < 0.0
}

function getIsXYSegmentClose(begin, end, point) {
	var delta = getSubtraction2D(end, begin)
	var deltaLength = length2D(delta)
	if (deltaLength == 0.0) {
		return distanceSquared2D(begin, point) < gQuarterCloseSquared
	}
	divide2DScalar(delta, deltaLength)
	var reverseRotation = [delta[0], -delta[1]]
	var beginRotated = getRotation2DVector(begin, reverseRotation)
	var endRotatedX = end[0] * reverseRotation[0] - end[1] * reverseRotation[1]
	var pointRotated = getRotation2DVector(point, reverseRotation)
	if (pointRotated[0] < beginRotated[0]) {
		return distanceSquared2D(begin, point) < gQuarterCloseSquared
	}
	if (pointRotated[0] > endRotatedX) {
		return distanceSquared2D(end, point) < gQuarterCloseSquared
	}
	return Math.abs(pointRotated[1] - beginRotated[1]) < gHalfClose
}

function getIsXYZCollinear(beginPoint, centerPoint, endPoint) {
	var vectorA = getSubtraction3D(centerPoint, beginPoint)
	var vectorB = getSubtraction3D(endPoint, centerPoint)
	var vectorALength = length3D(vectorA)
	var vectorBLength = length3D(vectorB)
	if (vectorALength == 0.0 && vectorBLength == 0.0) {
		warningByList(['In getIsCollinear both vectors have zero length:', vectorA, vectorB, beginPoint, centerPoint, endPoint])
		return true
	}
	if (vectorALength == 0.0 || vectorBLength == 0.0) {
		warningByList(['In getIsCollinear a vector has zero length:', vectorA, vectorB, beginPoint, centerPoint, endPoint])
		return false
	}
	divide3DScalar(vectorA, vectorALength)
	divide3DScalar(vectorB, vectorBLength)
	return Math.abs(dotProduct3D(vectorA, vectorB)) > 0.9999
}

function getIsXYZSegmentClose(begin, end, point) {
	var delta = getSubtraction2D(end, begin)
	var deltaLength = length2D(delta)
	if (deltaLength == 0.0) {
		return distanceSquared3D(begin, point) < gCloseSquared
	}
	divide3DScalar(delta, deltaLength)
	var reverseRotation = [delta[0], -delta[1]]
	var beginRotated = getRotation2DVector(begin, reverseRotation)
	var endRotated = getRotation2DVector(end, reverseRotation)
	var pointRotated = getRotation2DVector(point, reverseRotation)
	if (pointRotated[0] < beginRotated[0]) {
		return distanceSquared3D(begin, point) < gCloseSquared
	}
	if (pointRotated[0] > endRotated[0]) {
		return distanceSquared3D(end, point) < gCloseSquared
	}
	var pointAlong = (pointRotated[0] - beginRotated[0]) / (endRotated[0] - beginRotated[0])
	var xyDistance = Math.abs(pointRotated[1] - endRotated[1])
	var deltaHeight = point[2] - begin[2] * (1.0 - pointAlong) - end[2] * pointAlong
	return xyDistance * xyDistance + deltaHeight * deltaHeight < gCloseSquared
}

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
	return getJoinedFacetsByArcMap(arcMap)
}

function getJoinedFacetsByArcMap(arcMap) {
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

function getJoinedMap(length, linkMap) {
	var joinedMap = new Map()
	for (var index = 0; index < length; index++) {
		var linkTop = getLinkTop(index, linkMap)
		addElementToMapArray(index, linkTop, joinedMap)
	}
	return joinedMap
}

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
	return minimumWidth * 0.3 / (1.0 - getMinimumWidth(getOutsetPolygon([-0.3 * minimumWidth], polygon)) / minimumWidth)
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
	if (Math.abs(deltaY) < gHalfClose) {
/*
		var deltaX = toolEndX - toolBeginX
		var minimumX = Math.min(toolBeginX, toolEndX) - gClose
		var maximumX = Math.max(toolBeginX, toolEndX) + gClose
		if (workBeginX >= minimumX && workBeginX <= maximumX) {
			return {isToolNode:false, isWorkNode:true, workAlong:0.0, toolAlong:(workBeginX - toolBeginX) / deltaX}
		}
		if (workEndX >= minimumX && workEndX <= maximumX) {
			return {isToolNode:false, isWorkNode:true, workAlong:1.0, toolAlong:(workEndX - toolBeginX) / deltaX}
		}
		deltaX = workEndX - workBeginX
		minimumX = Math.min(workBeginX, workEndX) - gClose
		maximumX = Math.max(workBeginX, workEndX) + gClose
		if (toolBeginX >= minimumX && toolBeginX <= maximumX) {
			return {isToolNode:true, isWorkNode:false, workAlong:(toolBeginX - workBeginX) / deltaX, toolAlong:0.0}
		}
		if (toolEndX >= minimumX && toolEndX <= maximumX) {
			return {isToolNode:true, isWorkNode:false, workAlong:(toolBeginX - workBeginX) / deltaX, toolAlong:1.0}
		}
*/
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

function getMeetingByHeight(splitHeight, workBeginY, workEndY) {
	if (workBeginY > splitHeight == workEndY > splitHeight) {
		return null
	}
	var deltaY = workEndY - workBeginY
	if (Math.abs(deltaY) < gClose) {
		return {isWorkNode:true, workAlong:0.0}
	}
	var workAlong = (splitHeight - workBeginY) / deltaY
	if (workAlong < gClose || workAlong > gOneMinusClose) {
		return {isWorkNode:true, workAlong:1.0 * (workAlong > 0.5)}
	}
	return {isWorkNode:false, workAlong:workAlong}
}

function getMinimumWidth(polygon) {
	var minimumWidth = null
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = length2D(centerBegin)
		divide2DScalar(centerBegin, centerBeginLength)
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerEnd = getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = length2D(centerEnd)
		divide2DScalar(centerEnd, centerEndLength)
		var insetDelta = getInsetDelta(centerBegin, centerEnd)
		var insetDeltaLength = length2D(insetDelta)
		if (insetDeltaLength != 0.0) {
			divide2DScalar(insetDelta, insetDeltaLength)
			var xyRotator = [insetDelta[0], -insetDelta[1]]
			var polygonRotated = getRotations2DVector(polygon, xyRotator)
			var polylineRotated = polygonRotated.slice(vertexIndex + 1)
			pushArray(polylineRotated, polygonRotated.slice(0, vertexIndex))
			var centerRotated = polygonRotated[vertexIndex]
			var xIntersections = []
			addXIntersectionsByPolylineClose(xIntersections, polylineRotated, centerRotated[1])
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
	var normal = getCrossProductByPolygon(polygon)
	var normalLength = length3D(normal)
	if (normalLength == 0.0) {
		return null
	}
	return divide3DScalar(normal, normalLength)
}

function getNumberOfIntersectionsToLeft(x, xIntersections) {
	var numberOfIntersectionsToLeft = 0
	for (var xIntersection of xIntersections) {
		numberOfIntersectionsToLeft += (xIntersection <= x)
	}
	return numberOfIntersectionsToLeft
}

function getNumberOfShells(insideMap, polygonIndex) {
	if (insideMap.has(polygonIndex)) {
		return insideMap.get(polygonIndex).length
	}
	return 0
}

function getOperatedPolygonsByExclusion(exclusion, toolPolygon, workPolygon) {
	var alongIndexesMap = new Map()
	var meetingMap = new Map()
	addMeetingsByPolygon(alongIndexesMap, meetingMap, toolPolygon, workPolygon)
	sortAlongIndexesMap(alongIndexesMap, meetingMap)
	var extantPolygons = getExtantPolygons(alongIndexesMap, exclusion, false, meetingMap, toolPolygon, workPolygon)
	for (var extantPolygon of extantPolygons) {
		removeRepeats(extantPolygon)
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeStrings = extantPolygon[nodeStringIndex].split(' ')
			var meetingKey = nodeStrings[1]
			if (nodeStrings[0] == 't') {
				extantPolygon[nodeStringIndex] = toolPolygon[parseInt(meetingKey)]
			}
			else {
				if (nodeStrings[0] == 'w') {
					extantPolygon[nodeStringIndex] = workPolygon[parseInt(meetingKey)]
				}
				else {
					extantPolygon[nodeStringIndex] = meetingMap.get(meetingKey).point
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

function getOutlines(baseLocation, baseMarker, checkIntersection, markerAbsolute, outsets, polylines, tipMarker) {
	if (checkIntersection) {
		return getOutlinesCheckIntersection(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker)
	}
	return getOutlinesQuickly(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker)
}

function getOutlinesCheckIntersection(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker) {
	var outsetZero = outsets[0]
	var maximumRadius = Math.max(Math.abs(outsetZero[0]), Math.abs(outsetZero[1]))
	var outlines = getIntercircleLoopsByPolylines(polylines, 1.5 * maximumRadius)
	if (outsetZero[0] < 0.0) {
		for (var outline of outlines) {
			outline.reverse()
		}
	}
	for (var loopIndex = 0; loopIndex < outlines.length; loopIndex++) {
		var outline = outlines[loopIndex]
		outlines[loopIndex] = getOutsetPolygonByMarker(baseLocation, baseMarker, markerAbsolute, outsets, outline, tipMarker)
	}
	return outlines
}

function getOutlinesQuickly(baseLocation, baseMarker, markerAbsolute, outsets, polylines, tipMarker) {
	var arcMap = new Map()
	var gridMap = new Map()
	var nodes = []
	var outlines = []
	var points = []
	for (var polyline of polylines) {
		var previousIndex = null
		for (var point of polyline) {
			var pointIndex = getClosePointIndex(gridMap, point, points)
			if (pointIndex == nodes.length) {
				nodes.push([])
			}
			if (previousIndex != null) {
				nodes[previousIndex].push(pointIndex)
				nodes[pointIndex].push(previousIndex)
			}
			previousIndex = pointIndex
		}
	}
	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var node = nodes[nodeIndex]
		if (node.length > 1) {
			var nodePoint = points[nodeIndex]
			var vectorZero = normalize2D(getSubtraction2D(points[node[0]], nodePoint))
			for (var lineIndex = 1; lineIndex < node.length; lineIndex++) {
				var vector = normalize2D(getSubtraction2D(points[node[lineIndex]], nodePoint))
				var crossProductZ = crossProduct2D(vector, vectorZero)
				node[lineIndex] = [getRelativeDirection([dotProduct2D(vector, vectorZero), crossProductZ]), node[lineIndex]]
			}
			node[0] = [1.0, node[0]]
			node.sort(compareFirstElementDescending)
			for (var lineIndex = 0; lineIndex < node.length; lineIndex++) {
				node[lineIndex] = node[lineIndex][1]
			}
		}
	}
	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		var node = nodes[nodeIndex]
		for (var lineIndex = 0; lineIndex < node.length; lineIndex++) {
			var indexNodeLength = lineIndex + node.length
			arcMap.set(node[indexNodeLength % node.length] + ' ' + nodeIndex, node[(indexNodeLength + 1) % node.length])
		}
	}
	for (var key of arcMap.keys()) {
		var end = arcMap.get(key)
		if (end != null) {
			var nodeOutline = []
			do {
				nodeOutline.push(end)
				arcMap.set(key, null)
				key = key.split(' ')[1] + ' ' + end
				end = arcMap.get(key)
			}
			while (end != null)
			outlines.push(nodeOutline)
		}
	}
	for (var outlineIndex = 0; outlineIndex < outlines.length; outlineIndex++) {
		var polygon = getPolygonByFacet(outlines[outlineIndex], points)
		removeCollinearXYPoints(polygon)
		outlines[outlineIndex] = getOutsetPolygonByMarker(baseLocation, baseMarker, markerAbsolute, outsets, polygon, tipMarker)
	}
	return outlines
}

function getOutsetPolygon(outset, polygon) {
	removeIdentical2DPoints(polygon)
	var outsetPolygon = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = normalize2D(getSubtraction2D(beginPoint, centerPoint))
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerEnd = normalize2D(getSubtraction2D(endPoint, centerPoint))
		var outsetDelta = getAddition2D(centerBegin, centerEnd)
		var divisor = dotProduct2D([-centerEnd[1], centerEnd[0]], outsetDelta)
		if (divisor == 0.0) {
			divisor = 1.0
		}
		divide2DScalar(outsetDelta, divisor)
		outsetPolygon[vertexIndex] = add2D(centerPoint.slice(0), getMultiplication2D(outsetDelta, outset))
	}
	return outsetPolygon
}

function getOutsetPolygonByMarker(baseLocation, baseMarker, markerAbsolute, outsets, polygon, tipMarker) {
	removeIdentical2DPoints(polygon)
	var outset = outsets[0]
	var outsetPolygon = []
	var closestVertexIndex = null
	var stringAlongMap = null
	if (getIsEmpty(baseLocation)) {
		outsets = outsets[0]
	}
	else {
		var closestDistanceSquared = Number.MAX_VALUE
		for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
			var distanceSquared = distanceSquared2D(baseLocation, polygon[vertexIndex])
			if (distanceSquared < closestDistanceSquared) {
				closestDistanceSquared = distanceSquared
				closestVertexIndex = vertexIndex
			}
		}
		if (outsets.length > 1) {
			stringAlongMap = getStringAlongMap(closestVertexIndex, polygon)
		}
	}
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var centerBegin = normalize2D(getSubtraction2D(beginPoint, centerPoint))
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerEnd = normalize2D(getSubtraction2D(endPoint, centerPoint))
		var dotProduct = dotProduct2D(centerBegin, centerEnd)
		var centerRight = [-centerEnd[1], centerEnd[0]]
		var marker = tipMarker
		if (vertexIndex == closestVertexIndex) {
			marker = baseMarker
		}
		if (stringAlongMap != null) {
			var along = stringAlongMap.get(centerPoint[0].toString() + ' ' + centerPoint[1].toString())
			var alongOver = along / (outsets.length - 1)
			var lowerIndex = Math.floor(alongOver)
			var upperIndex = Math.ceil(alongOver)
			var along = alongOver - lowerIndex
			outset = getMultiplication2DScalar(outsets[lowerIndex], 1.0 - along)
			add2D(outset, getMultiplication2DScalar(outsets[upperIndex], along))
		}
		if (dotProduct > 0.1 && crossProduct2D(centerBegin, centerEnd) > -gClose) {
			var centerLeft = [centerBegin[1], -centerBegin[0]]
			if (dotProduct > 0.999 && marker != null) {
				outsetPolygon.push(add2D(centerPoint.slice(0), getMultiplication2D(centerLeft, outset)))
				for (var vertex of marker) {
					var rotatedVertex = getRotation2DVector(vertex, centerRight)
					if (!markerAbsolute) {
						multiply2D(rotatedVertex, outset)
					}
					outsetPolygon.push(add2D(centerPoint.slice(0), rotatedVertex))
				}
				outsetPolygon.push(add2D(centerPoint.slice(0), getMultiplication2D(centerRight, outset)))
			}
			else {
				var sideConcatenation = getAddition2D(centerRight, centerLeft)
				var backConcatenation = normalize2D(getAddition2D(centerBegin, centerEnd))
				var backProduct = dotProduct2D(backConcatenation, centerBegin)
				var backSideRemainder = 0.5 * length2D(sideConcatenation) / length2D(backConcatenation) - 1.0
				backSideRemainder /= dotProduct2D(backConcatenation, centerBegin)
				add2D(centerLeft, multiply2DScalar(centerBegin, backSideRemainder))
				add2D(centerRight, multiply2DScalar(centerEnd, backSideRemainder))
				outsetPolygon.push(add2D(centerPoint.slice(0), getMultiplication2D(centerLeft, outset)))
				outsetPolygon.push(add2D(centerPoint.slice(0), getMultiplication2D(centerRight, outset)))
			}
		}
		else {
			var outsetDelta = getAddition2D(centerBegin, centerEnd)
			divide2DScalar(outsetDelta, dotProduct2D(centerRight, outsetDelta))
			outsetPolygon.push(add2D(centerPoint.slice(0), getMultiplication2D(outsetDelta, outset)))
		}
	}
	return outsetPolygon
}

function getOutsetPolygonsByDirection(baseLocation, baseMarker, checkIntersection, clockwise, markerAbsolute, outsets, polygon, tipMarker) {
	if (polygon.length < 1) {
		return []
	}
	var polyline = polygon.slice(0)
	polyline.push(polyline[0])
	var outlines = getOutlines(baseLocation, baseMarker, checkIntersection, markerAbsolute, outsets, [polyline], tipMarker)
	if (clockwise) {
		return outlines.filter(getIsClockwise)
	}
	return outlines.filter(getIsWiddershins)
}

function getPlaneByNormal(normal) {
	var furthestAxis = [1.0, 0.0, 0.0]
	var smallestDotProduct = Math.abs(dotProduct3D(normal, furthestAxis))
	var yAxis = [0.0, 1.0, 0.0]
	var dotProduct = Math.abs(dotProduct3D(normal, yAxis))
	if (dotProduct < smallestDotProduct) {
		smallestDotProduct = dotProduct
		furthestAxis = yAxis
	}
	var zAxis = [0.0, 0.0, 1.0]
	dotProduct = Math.abs(dotProduct3D(normal, zAxis))
	if (dotProduct < smallestDotProduct) {
		furthestAxis = zAxis
	}
	var xBasis = crossProduct(normal, furthestAxis)
	divide3DScalar(xBasis, length3D(xBasis))
	return [xBasis, crossProduct(normal, xBasis)]
}

function getPointIndexesInCircle(gridMap, halfMinusOver, point, points, radiusSquared) {
	var floorX = Math.floor(point[0] * halfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * halfMinusOver)
	var floorYPlus = floorY + 2
	var indexesInCircle = []
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				var pointIndexes = gridMap.get(key)
				for (var pointIndex of pointIndexes) {
					if (distanceSquared2D(point, points[pointIndex]) <= radiusSquared) {
						indexesInCircle.push(pointIndex)
					}
				}
			}
		}
	}
	return indexesInCircle
}

function getPointsByString(pointString) {
	if (pointString == '') {
		return []
	}
	var parameterStrings = pointString.split(' ').filter(lengthCheck)
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
	xIntersections.sort(compareNumberAscending)
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

function getPolygon3D(polygon, z) {
	if (getIsEmpty(polygon)) {
		return polygon
	}
	if (polygon[0].length > 2) {
		return polygon
	}
	var polygon3D = new Array(polygon.length)
	z = getValueByDefault(0.0, z)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var vertex = polygon[vertexIndex]
		polygon3D[vertexIndex] = [vertex[0], vertex[1], z]
	}
	return polygon3D
}

function getPolygonArea(polygon) {
	return 0.5 * getDoublePolygonArea(polygon)
}

function getPolygonCrossesHeights(boundaryPolygon, splitHeight, splitPolygon, stratas) {
	if (!getIsPolygonInStratas(splitPolygon, stratas)) {
		return false
	}
	if (!getIsPolygonIntersectingOrClose(boundaryPolygon, splitPolygon)) {
		return false
	}
	for (var vertexIndex = 0; vertexIndex < splitPolygon.length; vertexIndex++) {
		if (splitHeight > splitPolygon[vertexIndex][2] != splitHeight > splitPolygon[(vertexIndex + 1) % splitPolygon.length][2]) {
			return true
		}
	}
	return false
}

function getPolygonByFacet(facet, points) {
	var polygon = new Array(facet.length)
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		polygon[vertexIndex] = points[facet[vertexIndex]]
	}
	return polygon
}

function getPolygonByFacets(facets, points) {
	var polygons = new Array(facets.length)
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		polygons[facetIndex] = getPolygonByFacet(facets[facetIndex], points)
	}
	return polygons
}

function getPolygonsByFacetIndexes(facetIndexes, facets, points) {
	var polygons = new Array(facetIndexes.length)
	for (var facetIndexIndex = 0; facetIndexIndex < facetIndexes.length; facetIndexIndex++) {
		polygons[facetIndexIndex] = getPolygonByFacet(facets[facetIndexes[facetIndexIndex]], points)
	}
	return polygons
}

function getPolygonGroups(polygons) {
	var polygonIndexGroups = getPolygonIndexGroups(polygons)
	var polygonGroups = new Array(polygonIndexGroups.length)
	for (var polygonGroupIndex = 0; polygonGroupIndex < polygonGroups.length; polygonGroupIndex++) {
		var polygonIndexGroup = polygonIndexGroups[polygonGroupIndex]
		if (polygonIndexGroup.length == 1) {
			polygonGroups[polygonGroupIndex] = [polygons[polygonIndexGroup]]
		}
		else {
			var polygonGroup = new Array(polygonIndexGroup.length)
			for (var polygonIndex = 0; polygonIndex < polygonGroup.length; polygonIndex++) {
				polygonGroup[polygonIndex] = polygons[polygonIndexGroup[polygonIndex]]
			}
			polygonGroups[polygonGroupIndex] = polygonGroup
		}
	}
	return polygonGroups
}

function getPolygonIndexGroups(polygons) {
	var insideMap = new Map()
	var outsideMap = new Map()
	var polygonIndexGroups = []
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var outsides = []
		var polygon = polygons[polygonIndex]
		var point = polygon[0]
		for (var outsideIndex = 0; outsideIndex < polygonIndex; outsideIndex++) {
			if (getPolygonInsideness(point, polygons[outsideIndex]) == 1) {
				outsides.push(outsideIndex)
				addElementToMapArray(outsideIndex, polygonIndex, insideMap)
			}
		}
		for (var outsideIndex = polygonIndex + 1; outsideIndex < polygons.length; outsideIndex++) {
			if (getPolygonInsideness(point, polygons[outsideIndex]) == 1) {
				outsides.push(outsideIndex)
				addElementToMapArray(outsideIndex, polygonIndex, insideMap)
			}
		}
	}
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		if (insideMap.has(polygonIndex)) {
			if (insideMap.get(polygonIndex).length % 2 == 0) {
				outsideMap.set(polygonIndex, [polygonIndex])
			}
		}
		else {
			outsideMap.set(polygonIndex, [polygonIndex])
		}
	}
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		if (!outsideMap.has(polygonIndex)) {
			var outsides = insideMap.get(polygonIndex)
			var insideIndex = outsides[0]
			var greatestShells = getNumberOfShells(insideMap, insideIndex)
			for (var outsideIndex = 1; outsideIndex < outsides.length; outsideIndex++) {
				var numberOfShells = getNumberOfShells(insideMap, outsides[outsideIndex])
				if (numberOfShells > greatestShells) {
					greatestShells = numberOfShells
					insideIndex = outsides[outsideIndex]
				}
			}
			addElementToMapArray(polygonIndex, insideIndex, outsideMap)
		}
	}
	for (var value of outsideMap.values()) {
		polygonIndexGroups.push(value)
	}
	return polygonIndexGroups
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

function getPolygonSegments(alongIndexesMap, meetingMap, polygon, prefix) {
	var polygonSegments = []
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var nodeKey = prefix + ' ' + vertexIndex.toString()
		polygonSegments.push([{nodeKey:nodeKey, point:polygon[vertexIndex]}])
		if (alongIndexesMap.has(nodeKey)) {
			var alongIndexes = alongIndexesMap.get(nodeKey)
			for (var alongIndex of alongIndexes) {
				if (alongIndex[0] == 0.0) {
					if (polygonSegments[polygonSegments.length - 1][0].nodeKey[0] != 'm') {
						polygonSegments.pop()
					}
				}
				polygonSegments.push([{nodeKey:'m ' + alongIndex[1], point:meetingMap.get(alongIndex[1]).point}])
			}
		}
	}
	for (var polygonSegmentIndex = 0; polygonSegmentIndex < polygonSegments.length; polygonSegmentIndex++) {
		polygonSegments[polygonSegmentIndex].push(polygonSegments[(polygonSegmentIndex + 1) % polygonSegments.length][0])
	}
	return polygonSegments
}

function getPolygonSlice(polygon, beginIndex, endIndex) {
	if (polygon.length == 0) {
		return []
	}
	var polygonSlice = []
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var sourceIndex = (vertexIndex + beginIndex) % polygon.length
		if (sourceIndex == endIndex) {
			return polygonSlice
		}
		polygonSlice.push(polygon[sourceIndex])
	}
	noticeByList(['Could not find the endIndex for getPolygonSlice in polygon.', polygon, beginIndex, endIndex])
	return polygon
}

function getRotatedSlice(polygon, beginIndex, endIndex, vector) {
	var polygonSlice = []
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var sourceIndex = (vertexIndex + beginIndex) % polygon.length
		if (sourceIndex == endIndex) {
			return polygonSlice
		}
		polygonSlice.push(getRotation2DVector(polygon[sourceIndex], vector))
	}
	noticeByList(['Could not find the endIndex for getPolygonSlice in polygon.', polygon, beginIndex, endIndex])
	return polygon
}

function getSegmentArrays(polygonSegments, startIndex) {
	var segmentArrays = []
	var workSegments = null
	for (var extraIndex = 0; extraIndex < polygonSegments.length; extraIndex++) {
		var segmentIndex = (startIndex + extraIndex) % polygonSegments.length
		var workPolygonSegment = polygonSegments[segmentIndex]
		if (workPolygonSegment == null) {
			if (workSegments != null) {
				segmentArrays.push(workSegments)
				workSegments = null
			}
		}
		else {
			if (workSegments == null) {
				workSegments = []
			}
			workSegments.push(workPolygonSegment)
		}
	}
	return segmentArrays
}

function getSlicePolygonsByArrowsMap(arrowsMap, points, z) {
	var xyPolygons = []
	for (var arrowKey of arrowsMap.keys()) {
		var arrows = arrowsMap.get(arrowKey)
		if (arrows != null) {
			var arrow = arrows[0]
			var keys = [arrowKey]
			arrowsMap.set(arrowKey, null)
			do {
				if (arrowsMap.has(arrow)) {
					var nextArrows = arrowsMap.get(arrow)
					if (nextArrows == null) {
						xyPolygons.push(keys)
						break
					}
					else {
						var closePolygon = true
						for (var nextArrow of nextArrows) {
							if (arrowKey != nextArrow) {
								arrowKey = arrow
								arrowsMap.set(arrowKey, null)
								arrow = nextArrow
								keys.push(arrowKey)
								closePolygon = false
								break
							}
						}
						if (closePolygon) {
							arrowsMap.set(arrowKey, null)
							arrow = arrowKey
						}
					}
				}
				else {
					xyPolygons.push(keys)
					break
				}
				if (keys[0] == arrow) {
					xyPolygons.push(keys)
					break
				}
			}
			while (keys.length < points.length)
		}
	}
	for (var xyPolygon of xyPolygons) {
		for (var keyIndex = 0; keyIndex < xyPolygon.length; keyIndex++) {
			xyPolygon[keyIndex] = getPointAlongEdge(xyPolygon[keyIndex], points, z)
		}
	}
	return xyPolygons
}

function getStringAlongMap(baseIndex, polygon) {
	var arrowSetMap = new Map()
	var baseString = polygon[baseIndex][0].toString() + ' ' + polygon[baseIndex][1].toString()
	var checkSet = new Set([baseString])
	var stringAlongMap = new Map([[baseString, [0.0, 0.0]]])
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		var pointString = polygon[vertexIndex][0].toString() + ' ' + polygon[vertexIndex][1].toString()
		var nextPointString = nextPoint[0].toString() + ' ' + nextPoint[1].toString()
		if (arrowSetMap.has(pointString)) {
			arrowSetMap.get(pointString).add(nextPointString)
		}
		else {
			arrowSetMap.set(pointString, new Set([nextPointString]))
		}
		if (arrowSetMap.has(nextPointString)) {
			arrowSetMap.get(nextPointString).add(pointString)
		}
		else {
			arrowSetMap.set(nextPointString, new Set([pointString]))
		}
	}
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		var newCheckSet = new Set()
		for (var checkString of checkSet) {
			var arrowSet = arrowSetMap.get(checkString)
			var checkWords = checkString.split(' ')
			var point = [parseFloat(checkWords[0]), parseFloat(checkWords[1])]
			for (var arrowString of arrowSet) {
				if (!stringAlongMap.has(arrowString)) {
					var arrowWords = arrowString.split(' ')
					var arrowPoint = [parseFloat(arrowWords[0]), parseFloat(arrowWords[1])]
					var distance = stringAlongMap.get(checkString)[0]
					newCheckSet.add(arrowString)
					stringAlongMap.set(arrowString, [distance + distance2D(point, arrowPoint), 0.0, checkString])
				}
			}
		}
		if (newCheckSet.size == 0) {
			break
		}
		checkSet = newCheckSet
	}
	for (var stringAlongKey of stringAlongMap.keys()) {
		var stringAlong = stringAlongMap.get(stringAlongKey)
		if (stringAlong.length > 2) {
			var arrowSet = arrowSetMap.get(stringAlongKey)
			var isTip = arrowSet.size == 1
			if (arrowSet.size == 2) {
				var vectors = []
				var stringWords = stringAlongKey.split(' ')
				var centerPoint = [parseFloat(stringWords[0]), parseFloat(stringWords[1])]
				for (var arrow of arrowSet) {
					var arrowWords = arrow.split(' ')
					vectors.push(normalize2D(getSubtraction2D([parseFloat(arrowWords[0]), parseFloat(arrowWords[1])], centerPoint)))
				}
				isTip = dotProduct2D(vectors[0], vectors[1]) > gOneMinusClose
			}
			if (isTip) {
				var tipDistance = stringAlong[0]
				for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
					if (tipDistance > stringAlong[1]) {
						stringAlong[1] = tipDistance
					}
					if (stringAlong[2] == null) {
						break
					}
					stringAlong = stringAlongMap.get(stringAlong[2])
				}
			}
		}
	}
	for (var stringAlongKey of stringAlongMap.keys()) {
		var stringAlongValue = stringAlongMap.get(stringAlongKey)
		stringAlongMap.set(stringAlongKey, stringAlongValue[0] / stringAlongValue[1])
	}
	return stringAlongMap
}

function getSwapped2DPolygon(polygon) {
	var swapped2DPolygon = new Array(polygon.length)
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var point = polygon[vertexIndex]
		swapped2DPolygon[vertexIndex] = [point[1], point[0]]
	}
	return swapped2DPolygon
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
	var bMinusA = getSubtraction2D(b, a)
	var bMinusALength = length2D(bMinusA)
	var bMinusAMmirror = [bMinusA[0] / bMinusALength, -bMinusA[1] / bMinusALength]
	var bMinusAX = bMinusA[0] * bMinusAMmirror[0] - bMinusA[1] * bMinusAMmirror[1]
	var cMinusA = getRotation2DVector(getSubtraction2D(c, a), bMinusAMmirror)
	var pointMinusA = getRotation2DVector(getSubtraction2D(point, a), bMinusAMmirror)
	var pointAlongC = pointMinusA[1] / cMinusA[1]
	var pointAlongB = (pointMinusA[0] - cMinusA[0] * pointAlongC) / bMinusAX
	var aMultiplied = getMultiplication3DScalar(a, 1 - pointAlongB - pointAlongC)
	var bMultiplied = getMultiplication3DScalar(b, pointAlongB)
	var cMultiplied = getMultiplication3DScalar(c, pointAlongC)
	var xyz = add3D(add3D(aMultiplied, bMultiplied), cMultiplied)
	return xyz[2]
}

function isPointInsideBoundingBox(boundingBox, point) {
	if (point[0] < boundingBox[0][0]) {
		return false
	}
	if (point[1] < boundingBox[0][1]) {
		return false
	}
	if (point[0] > boundingBox[1][0]) {
		return false
	}
	return point[1] <= boundingBox[1][1]
}

function isPointInsideBoundingBoxOrClose(boundingBox, point) {
	if (point[0] + gClose < boundingBox[0][0]) {
		return false
	}
	if (point[1] + gClose < boundingBox[0][1]) {
		return false
	}
	if (point[0] > boundingBox[1][0] + gClose) {
		return false
	}
	return point[1] < boundingBox[1][1] + gClose
}

function isPointOutsideOrBorderingCircles(gridMap, halfMinusOver, linkSet, point, points, radiusSquared) {
	var floorX = Math.floor(point[0] * halfMinusOver)
	var floorXPlus = floorX + 2
	var floorY = Math.floor(point[1] * halfMinusOver)
	var floorYPlus = floorY + 2
	for (var x = floorX; x < floorXPlus; x++) {
		for (var y = floorY; y < floorYPlus; y++) {
			var key = x.toString() + ' ' + y.toString()
			if (gridMap.has(key)) {
				var pointIndexes = gridMap.get(key)
				for (var pointIndex of pointIndexes) {
					if (!linkSet.has(pointIndex)) {
						if (distanceSquared2D(point, points[pointIndex]) <= radiusSquared) {
							return false
						}
					}
				}
			}
		}
	}
	return true
}

function nullifyExcludedMidpoints(excludeInsidenessSet, otherPolygon, polygonSegments) {
	for (var vertexIndex = 0; vertexIndex < polygonSegments.length; vertexIndex++) {
		var polygonSegment = polygonSegments[vertexIndex]
		if (polygonSegment != null) {
			var midpoint = getMidpoint2D(polygonSegment[0].point, polygonSegment[1].point)
			if (excludeInsidenessSet.has(getPolygonInsideness(midpoint, otherPolygon))) {
				polygonSegments[vertexIndex] = null
			}
		}
	}
}

function nullifyExcludedPoints(excludeInsideness, otherPolygon, polygonSegments) {
	for (var vertexIndex = 0; vertexIndex < polygonSegments.length; vertexIndex++) {
		var polygonSegment = polygonSegments[vertexIndex]
		if (polygonSegment != null) {
			var point = polygonSegment[1].point
			if (excludeInsideness == getPolygonInsideness(point, otherPolygon)) {
				polygonSegments[vertexIndex] = null
				polygonSegments[(vertexIndex + 1) % polygonSegments.length] = null
			}
		}
	}
}

function removeClose2DPoints(points) {
	var gridSet = new Set()
	var distantIndex = 0
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var floorX = Math.floor(point[0] * gHalfMinusOver)
		var floorXPlus = floorX + 2
		var floorY = Math.floor(point[1] * gHalfMinusOver)
		var floorYPlus = floorY + 2
		var isFar = true
		for (var x = floorX; x < floorXPlus; x++) {
			for (var y = floorY; y < floorYPlus; y++) {
				var key = x.toString() + ' ' + y.toString()
				if (gridSet.has(key)) {
					isFar = false
					break
				}
			}
		}
		if (isFar) {
			points[distantIndex] = point
			distantIndex += 1
		}
		gridSet.add(Math.round(point[0] * gHalfMinusOver).toString() + ' ' + Math.round(point[1] * gHalfMinusOver).toString())
	}
	points.length = distantIndex
}

function removeCollinearPointsByFacets(collinearities, facets) {
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			if (collinearities[facet[vertexIndex]]) {
				facet[vertexIndex] = null
			}
		}
		removeNulls(facet)
	}
}

function removeCollinearPointsByMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var collinearities = new Array(points.length).fill(true)
	for (var facet of facets) {
		addFacetToCollinearities(collinearities, facet, points)
	}
	removeCollinearPointsByFacets(collinearities, facets)
}

function removeCollinearXYPoints(polygon) {
	removeIdentical2DPoints(polygon)
	var nullIndexSet = new Set()
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var beginPoint = polygon[(vertexIndex - 1 + polygon.length) % polygon.length]
		var centerPoint = polygon[vertexIndex]
		var endPoint = polygon[(vertexIndex + 1) % polygon.length]
		var centerBegin = normalize2D(getSubtraction2D(beginPoint, centerPoint))
		var endCenter = normalize2D(getSubtraction2D(centerPoint, endPoint))
		if (dotProduct2D(centerBegin, endCenter) > gOneMinusClose) {
			nullIndexSet.add(vertexIndex)
		}
	}
	removeNullsBySet(polygon, nullIndexSet)
}

function removeIdentical2DPoints(polygon) {
	if (polygon.length < 2) {
		return polygon
	}
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = polygon[vertexIndex]
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		if (point[0] == nextPoint[0] && point[1] == nextPoint[1]) {
			polygon.splice(vertexIndex, 1)
		}
	}
	return polygon
}

function removeIdentical3DPoints(polygon) {
	for (var vertexIndex = polygon.length - 1; vertexIndex > -1; vertexIndex--) {
		var point = polygon[vertexIndex]
		var nextPoint = polygon[(vertexIndex + 1) % polygon.length]
		if (point[0] == nextPoint[0] && point[1] == nextPoint[1] && point[2] == nextPoint[2]) {
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
			var xyDistanceSquared = distanceSquared2D(point, otherPoint)
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

function sortAlongIndexesMap(alongIndexesMap) {
	for (var alongIndexes of alongIndexesMap.values()) {
		alongIndexes.sort(compareFirstElementAscending)
	}
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

function getUnionPolygons(toolPolygon, workPolygon) {
	var isWorkClockwise = getIsClockwise(workPolygon)
	return getOperatedPolygonsByExclusion(gUnionExclusion, getDirectedPolygon(isWorkClockwise, toolPolygon), workPolygon)
}

function getUnionPolygonsByPolygons(polygons) {
	if (polygons.length == 0) {
		return []
	}
	var joinedPolygons = [polygons[0]]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		var operatedPolygons = []
		for (var joinedPolygon of joinedPolygons) {
			pushArray(operatedPolygons, getUnionPolygons(polygons[polygonIndex], joinedPolygon))
		}
		joinedPolygons = operatedPolygons
	}
	return joinedPolygons
}

function xyPointIsCloseToPoints(point, xyPoints) {
	for (var xyPoint of xyPoints) {
		if (distanceSquared2D(point, xyPoint) < gCloseSquared) {
			return true
		}
	}
	return false
}
