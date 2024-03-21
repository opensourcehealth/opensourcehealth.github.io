//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addArraysToSpreadsheetStrings(arrays, name, strings) {
	strings.push('_arrays\t' + name)
	var arraysCopy = new Array(arrays.length)
	for (var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++) {
		arraysCopy[arrayIndex] = arrays[arrayIndex].join('\t')
	}
	pushArray(strings, arraysCopy)
	strings.push('_end')
}

function addConnectedSegmentsToFacets(meetingMap, facet, facets, toolSegments, workSegments) {
	var connectedSegmentArrays = getPolynodes(toolSegments, workSegments)
	for (var extantFacet of connectedSegmentArrays) {
		removeRepeats(extantFacet)
		for (var nodeStringIndex = 0; nodeStringIndex < extantFacet.length; nodeStringIndex++) {
			var nodeStrings = extantFacet[nodeStringIndex].split(' ')
			var meetingKey = nodeStrings[1]
			if (nodeStrings[0] == 'w') {
				extantFacet[nodeStringIndex] = facet[parseInt(meetingKey)]
			}
			else {
				extantFacet[nodeStringIndex] = meetingMap.get(meetingKey).pointIndex
			}
		}
		facets.push(extantFacet)
	}
}

function addFacetsByArrowMap(arrowMap, facets) {
// in future maybe replace this with addFacetsByIntegerArrowMap
	for (var arrow of arrowMap.values()) {
		if (arrow != null) {
			var facet = [arrow.beginKey]
			arrowMap.set(arrow.beginKey, null)
			do {
				if (arrowMap.has(arrow.endKey)) {
					var nextArrow = arrowMap.get(arrow.endKey)
					if (nextArrow == null) {
//						warningString = 'In addFacetsByArrowMap, arrow.endKey:\n was null in the arrowMap:\n from the facet:\n'
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
//					warningString = 'In addFacetsByArrowMap, arrow.endKey:\n was not in the arrowMap:\n from the facet:\n'
//					warning(warningString, [arrow, arrowMap, facet])
					break
				}
				if (facet[0] == arrow.endKey) {
					facets.push(facet)
					break
				}
				if (facet.length > gLengthLimit) {
					warningString = 'In addFacetsByArrowMap, polygon is too large or there is a mistake, length: \narrowKey: \nfacet: '
					warning(warningString, [facet.length, arrow, facet])
					break
				}
			}
			while (true)
		}
	}
	return facets
}

function addFacetsByFacetSplit(facets, facetSplit, meetingMap, points, splitHeight) {
	var toolAlongIndexes = facetSplit.toolAlongIndexes
	if (toolAlongIndexes.length == 0) {
		return
	}
	var facet = facetSplit.facet
	if (facet.length < 3) {
		return
	}
	var alongIndexesMap = facetSplit.alongIndexesMap
	var workPolygon3D = getPolygonByFacet(facet, points)
	sortAlongIndexesMap(alongIndexesMap)
	var bottomSegments = getPolygonSegments(alongIndexesMap, meetingMap, workPolygon3D, 'w')
	var topSegments = getTopSegments(2, bottomSegments, splitHeight)
	var toolSegments = toolAlongIndexes
	for (var toolSegmentIndex = 0; toolSegmentIndex < toolSegments.length; toolSegmentIndex++) {
		var meetingKey = toolSegments[toolSegmentIndex][1]
		toolSegments[toolSegmentIndex] = [{nodeKey:'m ' + meetingKey, point:meetingMap.get(meetingKey).point}]
	}
	for (var toolSegmentIndex = 0; toolSegmentIndex < toolSegments.length - 1; toolSegmentIndex++) {
		toolSegments[toolSegmentIndex].push(toolSegments[toolSegmentIndex + 1][0])
	}
	toolSegments.pop()
	var splitFacets = []
	addConnectedSegmentsToFacets(meetingMap, facet, splitFacets, toolSegments, bottomSegments)
	toolSegments.reverse()
	reverseArrays(toolSegments)
	addConnectedSegmentsToFacets(meetingMap, facet, splitFacets, toolSegments, topSegments)
	removeShortArrays(splitFacets, 3)
	if (splitFacets.length == 0) {
		return
	}
	overwriteArray(facet, splitFacets[0])
	for (var splitFacetIndex = 1; splitFacetIndex < splitFacets.length; splitFacetIndex++) {
		facets.push(splitFacets[splitFacetIndex])
	}
}

function addFacetToCollinearities(collinearities, facet, points) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var beginIndex = facet[(vertexIndex + facet.length - 1) % facet.length]
		var centerIndex = facet[vertexIndex]
		var endIndex = facet[(vertexIndex + 1) % facet.length]
		if (!getIsXYZCollinear(points[beginIndex], points[centerIndex], points[endIndex])) {
			collinearities[centerIndex] = false
		}
	}
}

function addFirstTwoKeysToLinkMap(keysMap, linkMap) {
	for (var keys of keysMap.values()) {
		if (keys.length == 2) {
			addToLinkMap(keys[0], keys[1], linkMap)
		}
	}
}

function addMeetingsToFacet(arrowAlongMap, facet, meetingMap) {
	for (var vertexIndex = facet.length - 1; vertexIndex > -1; vertexIndex--) {
		var endVertexIndex = (vertexIndex + 1) % facet.length
		var arrowKey = facet[vertexIndex].toString() + ' ' + facet[endVertexIndex].toString()
		if (arrowAlongMap.has(arrowKey)) {
			var alongIndexes = arrowAlongMap.get(arrowKey)
			var segment = []
			for (var alongIndexIndex = alongIndexes.length - 1; alongIndexIndex > -1 ; alongIndexIndex--) {
				var meeting = meetingMap.get(alongIndexes[alongIndexIndex][1])
				if (!meeting.isWorkNode) {
					segment.push(meeting.pointIndex)
				}
			}
			spliceArray(facet, endVertexIndex, segment)
		}
	}
}

function addMeshToAssembledMesh(assembledMesh, meshCopy) {
	var pointLength = assembledMesh.points.length
	pushArray(assembledMesh.points, meshCopy.points)
	for (var facet of meshCopy.facets) {
		addArrayScalar(facet, pointLength)
	}

	pushArray(assembledMesh.facets, meshCopy.facets)
	if (meshCopy.intersectionIndexesMap != undefined) {
		for (var intersectionIndexes of meshCopy.intersectionIndexesMap.values()) {
			addArrayScalar(intersectionIndexes, pointLength)
		}
		if (assembledMesh.intersectionIndexesMap == undefined) {
			assembledMesh.intersectionIndexesMap = new Map(meshCopy.intersectionIndexesMap.entries())
		}
		else {
			addMapToMapArray(assembledMesh.intersectionIndexesMap, meshCopy.intersectionIndexesMap)
		}
	}

	if (meshCopy.splitIndexesMap != undefined) {
		for (var splitIndexes of meshCopy.splitIndexesMap.values()) {
			addArrayScalar(splitIndexes, pointLength)
		}
		if (assembledMesh.splitIndexesMap == undefined) {
			assembledMesh.splitIndexesMap = new Map(meshCopy.splitIndexesMap.entries())
		}
		else {
			addMapToMapArray(assembledMesh.splitIndexesMap, meshCopy.splitIndexesMap)
		}
	}
}

function addMeshToJoinedMesh(joinedMesh, otherMesh) {
	var joinedCenters = getCenters(joinedMesh)
	var joinedFacets = joinedMesh.facets
	var otherMeshFacets = getArraysCopy(otherMesh.facets)
	var otherCenters = getCenters(otherMesh)
	var points = joinedMesh.points
	var squaredDistances = new Array(joinedCenters.length)
	if (joinedCenters.length == 0 || otherCenters.length == 0) {
		return
	}
	for (var joinedIndex = 0; joinedIndex < joinedCenters.length; joinedIndex++) {
		var closestFacetDistanceSquared = Number.MAX_VALUE
		var closestFacetOtherIndex = null
		var joinedCenter = joinedCenters[joinedIndex]
		for (var otherIndex = 0; otherIndex < otherCenters.length; otherIndex++) {
			var distanceSquared = distanceSquared3D(joinedCenter, otherCenters[otherIndex])
			if (distanceSquared < closestFacetDistanceSquared) {
				closestFacetOtherIndex = otherIndex
				closestFacetDistanceSquared = distanceSquared
			}
		}
		squaredDistances[joinedIndex] = [closestFacetDistanceSquared, joinedIndex, closestFacetOtherIndex]
	}
	squaredDistances.sort(compareFirstElementAscending)
	var originalPointLength = points.length
	for (var facet of otherMeshFacets) {
		addArrayScalar(facet, originalPointLength)
	}
	pushArray(points, otherMesh.points)
	var squaredDistancesZero = squaredDistances[0]
	var closestSquared = squaredDistancesZero[0]
	var endIndex = 0
	for (var squaredDistanceIndex = 1; squaredDistanceIndex < squaredDistances.length; squaredDistanceIndex++) {
		var squaredDistance = squaredDistances[squaredDistanceIndex]
		if (squaredDistance[0] - closestSquared < gClose) {
			endIndex = squaredDistanceIndex
		}
		else {
			break
		}
	}
	endIndex += 1
	var connectedJoinedFacets = []
	var connectedOtherFacets = []
	for (var squaredDistanceIndex = 0; squaredDistanceIndex < endIndex; squaredDistanceIndex++) {
		var squaredDistance = squaredDistances[squaredDistanceIndex]
		connectedJoinedFacets.push(joinedFacets[squaredDistance[1]])
		joinedFacets[squaredDistance[1]] = []
		connectedOtherFacets.push(otherMeshFacets[squaredDistance[2]])
		otherMeshFacets[squaredDistance[2]] = []
	}
	connectedJoinedFacets = getJoinedFacets(connectedJoinedFacets)
	connectedOtherFacets = getJoinedFacets(connectedOtherFacets)
	for (var connectedFacetIndex = 0; connectedFacetIndex < connectedJoinedFacets.length; connectedFacetIndex++) {
		var connectedJoinedFacet = connectedJoinedFacets[connectedFacetIndex]
		var connectedOtherFacet = connectedOtherFacets[connectedFacetIndex]
		joinFacets(joinedFacets, connectedJoinedFacet, otherMeshFacets, connectedOtherFacet, points)
	}
	pushArray(joinedFacets, otherMeshFacets)
	removeShortArrays(joinedFacets, 3)
	removeUnfacetedPoints(joinedMesh)
}

function addPointsToFacets(mesh, segmentMap) {
	var arrowMap = new Map()
	var points = mesh.points
	for (var entry of segmentMap.entries()) {
		var pointIndexes = entry[1]
		var pointIndexStrings = entry[0].split(' ')
		var minimumPoint = points[parseInt(pointIndexStrings[0])]
		for (var pointIndexesIndex = 0; pointIndexesIndex <  pointIndexes.length; pointIndexesIndex++) {
			var pointIndex = pointIndexes[pointIndexesIndex]
			pointIndexes[pointIndexesIndex] = [distanceSquared3D(minimumPoint, points[pointIndex]), pointIndex]
		}
		pointIndexes.sort(compareFirstElementAscending)
		for (var pointIndexesIndex = 0; pointIndexesIndex <  pointIndexes.length; pointIndexesIndex++) {
			pointIndexes[pointIndexesIndex] = pointIndexes[pointIndexesIndex][1]
		}
		arrowMap.set(entry[0], pointIndexes)
		arrowMap.set(pointIndexStrings[1] + ' ' + pointIndexStrings[0], pointIndexes.slice(0).reverse())
	}

	for (var facet of mesh.facets) {
		for (var vertexIndex = facet.length - 1; vertexIndex > -1; vertexIndex--) {
			var endIndex = (vertexIndex + 1) % facet.length
			var forwardKey = facet[vertexIndex].toString() + ' ' + facet[endIndex].toString()
			if (arrowMap.has(forwardKey)) {
				spliceArray(facet, endIndex, arrowMap.get(forwardKey))
			}
		}
	}
}

function addPointsToIndexSet(pointIndexSet, points, polygons) {
	for (var polygon of polygons) {
		var boundingBox = getBoundingBox(polygon)
		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			var point = points[pointIndex]
			if (isPointInsideBoundingBoxPolygonOrClose(boundingBox, point, polygon)) {
				pointIndexSet.add(pointIndex)
			}
		}
	}
}

function addSplitIndexes(id, splitHeights, workMesh) {
	if (splitHeights == undefined) {
		return
	}
	var facets = workMesh.facets
	var points = workMesh.points
	for (var splitHeight of splitHeights) {
		var facetSplits = []
		for (var facet of facets) {
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var pointIndex = facet[vertexIndex]
				var nextIndex = facet[(vertexIndex + 1) % facet.length]
				if (!getIsAwayFromHeight(splitHeight, points[pointIndex][2], points[nextIndex][2])) {
					facetSplits.push({facet:facet})
					break
				}
			}
		}
		addSplitIndexesBySplits(facetSplits, id, [], splitHeight, workMesh)
	}
}

function addSplitIndexesByFacetSet(facetIndexSet, id, splitHeight, workMesh) {
	var arrowSet = new Set()
	var facets = workMesh.facets
	var facetSplits = []
	var outerFacetSplits = []
	var points = workMesh.points
	for (var facetIndex of facetIndexSet) {
		var facet = facets[facetIndex]
		facetSplits.push({facet:facet})
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextIndex = facet[(vertexIndex + 1) % facet.length]
			if (!getIsAwayFromHeight(splitHeight, points[pointIndex][2], points[nextIndex][2])) {
				arrowSet.add(nextIndex + ' ' + pointIndex)
			}
		}
	}

	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		if (!facetIndexSet.has(facetIndex)) {
			if (facetSharesArrow(facets[facetIndex], arrowSet)) {
				outerFacetSplits.push({facet:facets[facetIndex]})
			}
		}
	}

	addSplitIndexesBySplits(facetSplits, id, outerFacetSplits, splitHeight, workMesh)
}

function addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh) {
	if (getIsEmpty(splitHeights)) {
		return
	}

	var facets = workMesh.facets
	var points = workMesh.points
	for (var splitHeight of splitHeights) {
		var arrowSet = new Set()
		var facetIndexSet = new Set()
		for (var facetIndex = facetIndexStart; facetIndex < facets.length; facetIndex++) {
			var facet = facets[facetIndex]
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var pointIndex = facet[vertexIndex]
				var nextIndex = facet[(vertexIndex + 1) % facet.length]
				if (!getIsAwayFromHeight(splitHeight, points[pointIndex][2], points[nextIndex][2])) {
					arrowSet.add(nextIndex + ' ' + pointIndex)
					facetIndexSet.add(facetIndex)
				}
			}
		}
		for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
			var facet = facets[facetIndex]
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var pointIndex = facet[vertexIndex]
				var nextIndex = facet[(vertexIndex + 1) % facet.length]
				if (arrowSet.has(pointIndex + ' ' + nextIndex)) {
					facetIndexSet.add(facetIndex)
				}
			}
		}
		addSplitIndexesByFacetSet(facetIndexSet, id, splitHeight, workMesh)
	}
}

function addSplitIndexesBySplits(facetSplits, id, outerFacetSplits, splitHeight, workMesh) {
	var arrowAlongMap = new Map()
	if (getIsEmpty(workMesh.points)) {
		return
	}

	var meetingMap = getMeetingMapByHeight(facetSplits, splitHeight, workMesh)
	for (var facetSplit of facetSplits) {
		var alongIndexesMap = facetSplit.alongIndexesMap
		for (var nodeKey of alongIndexesMap.keys()) {
			var facet = facetSplit.facet
			var splitKeys = nodeKey.split(' ')
			var nodeSuffix = splitKeys[splitKeys.length - 1]
			var beginIndex = parseInt(nodeSuffix)
			var endIndex = (beginIndex + 1) % facet.length
			arrowAlongMap.set(facet[endIndex].toString() + ' ' + facet[beginIndex].toString(), alongIndexesMap.get('w ' + nodeSuffix))
		}
	}

	for (var facetSplit of facetSplits) {
		addFacetsByFacetSplit(workMesh.facets, facetSplit, meetingMap, workMesh.points, splitHeight)
	}

	for (var outerFacetSplit of outerFacetSplits) {
		addMeetingsToFacet(arrowAlongMap, outerFacetSplit.facet, meetingMap)
	}

	var pointIndexSet = new Set()
	for (var meeting of meetingMap.values()) {
		pointIndexSet.add(meeting.pointIndex)
	}

	if (pointIndexSet.size > 0) {
		if (workMesh.splitIndexesMap == undefined) {
			workMesh.splitIndexesMap = new Map()
		}
		addElementsToMapArray(workMesh.splitIndexesMap, id, Array.from(pointIndexSet))
	}
}

function addToArrowsMap(arrowsMap, edges) {
	addElementToMapArray(arrowsMap, edges[0], edges[1])
	addElementToMapArray(arrowsMap, edges[1], edges[0])
}

function getToolMeshIndexByFacet(directedIndex, facetIntersection, facetVertexIndexes, toolPolygon, workMesh) {
	var facetVertexIndex = facetVertexIndexes.facet[directedIndex]
	var pointIndex = facetVertexIndexes.pointIndexes[facetVertexIndex]
	if (pointIndex == null) {
		var toolMeshIndex = getToolMeshIndex(directedIndex, facetIntersection, toolPolygon, workMesh)
		facetVertexIndexes.pointIndexes[facetVertexIndex] = toolMeshIndex
		return toolMeshIndex
	}
	return pointIndex
}

function alterFacetsAddHorizontals(exclusion, facetIntersection, facetIntersections, meetingMap, strata, toolPolygon, workMesh) {
	var alongIndexesMap = facetIntersection.alongIndexesMap
	var facets = workMesh.facets
	var facetIndex = facetIntersection.facetIndex
	var points = workMesh.points
	var workPolygon = facetIntersection.workPolygon
	var facetVertexIndexes = getFacetVertexIndexes(toolPolygon)
	facetVertexIndexes.pointIndexes = []
	if (alongIndexesMap.size == 0) {
		if (!getIsPointInsidePolygon(toolPolygon[0], workPolygon)) {
			facets[facetIndex] = []
			return
		}
		var toolFacet = new Array(toolPolygon.length)
		for (var vertexIndex = 0; vertexIndex < toolPolygon.length; vertexIndex++) {
			toolFacet[vertexIndex] = getToolMeshIndexByFacet(vertexIndex, facetIntersection, facetVertexIndexes, toolPolygon, workMesh)
		}
		if (getIsFacetInStrata(toolFacet, points, strata)) {
			if (facetIntersection.isToolReversed) {
				toolFacet.reverse()
			}
			if (exclusion.workExclusion == -1) {
				facets[facetIndex] = toolFacet
			}
			else {
				facets[facetIndex] = getConnectedFacet([facets[facetIndex], toolFacet], points)
			}
		}
		return
	}
	if (facetIntersection.isVertical) {
		sortVertically(alongIndexesMap, meetingMap, toolPolygon, workPolygon)
	}
	var extantPolygons = getExtantPolygons(alongIndexesMap, exclusion, facetIntersection.isVertical, meetingMap, toolPolygon, workPolygon)
	for (var extantPolygon of extantPolygons) {
		removeRepeats(extantPolygon)
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeKey = extantPolygon[nodeStringIndex]
			var nodeStrings = nodeKey.split(' ')
			var extantIndex = getExtantIndex(nodeStrings, facetIntersection, facetVertexIndexes, meetingMap, points, toolPolygon, workMesh)
			extantPolygon[nodeStringIndex] = extantIndex
		}
		if (facetIntersection.isToolReversed) {
			extantPolygon.reverse()
		}
	}
	removeShortArrays(extantPolygons, 3)
	if (extantPolygons.length == 0) {
		facets[facetIndex] = []
		return
	}

	if (!getIsAFacetInStrata(extantPolygons, points, strata)) {
		facets[facetIndex] = []
		return
	}

	facets[facetIndex] = extantPolygons[0]
	for (var remainingIndex = 1; remainingIndex < extantPolygons.length; remainingIndex++) {
		facets.push(extantPolygons[remainingIndex])
	}
}

function directFacetIntersections(facetIntersections, isBottomClockwise) {
	for (var facetIntersection of facetIntersections) {
		facetIntersection.isToolReversed = facetIntersection.isClockwise != isBottomClockwise
		if (facetIntersection.isToolReversed) {
			facetIntersection.facet = facetIntersection.facet.slice(0).reverse()
			facetIntersection.workPolygon = facetIntersection.workPolygon.slice(0).reverse()
		}
	}
}

function facetSharesArrow(facet, sharedArrowSet) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		if (sharedArrowSet.has(facet[vertexIndex] + ' ' + facet[(vertexIndex + 1) % facet.length])) {
			return true
		}
	}
	return false
}

function getAllConvexFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var allConvexFacets = []
	var xyPoints = new Array(points.length)
	removeShortArrays(facets, 3)
	for (var facet of facets) {
		var originalFacet = facet.slice(0)
		var convexFacets = getConvex3DFacets(facet, points, xyPoints)
		for (var convexFacetIndex = convexFacets.length - 1; convexFacetIndex > -1; convexFacetIndex--) {
			if (getNormalByFacet(convexFacets[convexFacetIndex], points) == undefined) {
				convexFacets.splice(convexFacetIndex, 1)
			}
		}
		pushArray(allConvexFacets, convexFacets)
	}

	return allConvexFacets
}

function getAllTriangleFacets(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var allTriangleFacets = []
	var xyPoints = new Array(points.length)
	removeShortArrays(facets, 3)
	for (var facet of facets) {
		var originalFacet = facet.slice(0)
		var triangleFacets = getTriangle3DFacets(facet, points, xyPoints)
		for (var triangleFacetIndex = triangleFacets.length - 1; triangleFacetIndex > -1; triangleFacetIndex--) {
			if (getNormalByFacet(triangleFacets[triangleFacetIndex], points) == undefined) {
				triangleFacets.splice(triangleFacetIndex, 1)
			}
		}
		var arrowsMap = getArrowsMap(triangleFacets)
		var multiples = []
		var xyMultiples = []
		for (var arrows of arrowsMap.values()) {
			if (arrows.length > 1) {
				multiples.push(arrows)
				xyMultiples.push(getPolygonByFacet(arrows[0].split(','), xyPoints))
			}
		}
		if (multiples.length > 0) {
			var original = getPolygonByFacet(originalFacet, points).join(' ')
			var xyPolygon = getPolygonByFacet(originalFacet, xyPoints).join(' ')
			var message = 'identical arrows in getAllTriangleFacets in polyhedron.'
			noticeByList([message, multiples, xyMultiples, original, xyPolygon, triangleFacets.join(' ')])
		}
		pushArray(allTriangleFacets, triangleFacets)
	}

	return allTriangleFacets
}

function getArrowMap(facets) {
	var arrowMap = new Map()
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			arrowMap.set(facet[vertexIndex] + ' ' + facet[(vertexIndex + 1) % facet.length], facetIndex)
		}
	}
	return arrowMap
}

function getArrowsMap(facets) {
	var arrowMap = new Map()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var arrow = facet[vertexIndex] + ',' + facet[(vertexIndex + 1) % facet.length]
			addElementToMapArray(arrowMap, arrow, arrow)
		}
	}
	return arrowMap
}

function getCenter(facet, points) {
	var center = [0.0, 0.0, 0.0]
	for (var pointIndex of facet) {
		add3D(center, points[pointIndex])
	}
	divide3DScalar(center, facet.length)
	return center
}

function getCenters(mesh) {
	var centers = new Array(mesh.facets.length)
	var facets = mesh.facets
	var points = mesh.points
	for (var facetIndex = 0; facetIndex < centers.length; facetIndex++) {
		centers[facetIndex] = getCenter(facets[facetIndex], points)
	}
	return centers
}

function getClosedFacet(beginIndex, facet) {
	var facetLengthPlus = facet.length + 1
	var closedFacet = new Array(facetLengthPlus)
	for (var keyIndex = 0; keyIndex < facetLengthPlus; keyIndex++) {
		closedFacet[keyIndex] = facet[beginIndex % facet.length]
		beginIndex += 1
	}
	return closedFacet
}

function getClosestConnectionByFacets(facets, points) {
	var closestDistanceSquared = Number.MAX_VALUE
	var connection = {}
	var distanceConnections = []
	var polygons = getPolygonsByFacets(facets, points)
	var firstFacet = facets[0]
	var firstPolygon = polygons[0]
	var firstCenter = [0.0, 0.0]
	for (var point of firstPolygon) {
		add2D(firstCenter, point)
	}

	divide2DScalar(firstCenter, firstPolygon.length)
	for (var otherFacetIndex = 1; otherFacetIndex < facets.length; otherFacetIndex++) {
		var otherPolygon = polygons[otherFacetIndex]
		for (var otherVertexIndex = 0; otherVertexIndex < otherPolygon.length; otherVertexIndex++) {
			distanceConnections.push([distanceSquared2D(firstCenter, otherPolygon[otherVertexIndex]), otherFacetIndex, otherVertexIndex])
		}
	}

	distanceConnections.sort(compareFirstElementAscending)
	for (var distanceConnection of distanceConnections) {
		var otherFacetIndex = distanceConnection[1]
		var otherVertexIndex = distanceConnection[2]
		var otherPolygon = polygons[otherFacetIndex]
		var otherPoint = otherPolygon[otherVertexIndex]
		for (var firstVertexIndex = 0; firstVertexIndex < firstPolygon.length; firstVertexIndex++) {
			var firstPoint = firstPolygon[firstVertexIndex]
			var firstCheck = getSubtraction2D(firstPoint, otherPoint)
			var distanceSquared = lengthSquared2D(firstCheck)
			if (distanceSquared < closestDistanceSquared && distanceSquared > 0.0) {
				if (getIsConnectionClear
				(distanceSquared, firstCheck, firstPoint, firstVertexIndex, polygons, otherPoint, otherFacetIndex, otherVertexIndex)) {
					closestDistanceSquared = distanceSquared
					connection.firstVertexIndex = firstVertexIndex
					connection.otherVertexIndex = otherVertexIndex
					connection.otherFacetIndex = otherFacetIndex
				}
			}
		}
		if (connection.firstVertexIndex != undefined) {
			break
		}
	}

	var otherFacetIndex = connection.otherFacetIndex
	var otherPolygon = polygons[otherFacetIndex]
	for (var firstVertexIndex = 0; firstVertexIndex < firstPolygon.length; firstVertexIndex++) {
		var firstPoint = firstPolygon[firstVertexIndex]
		for (var otherVertexIndex = 0; otherVertexIndex < otherPolygon.length; otherVertexIndex++) {
			var otherPoint = otherPolygon[otherVertexIndex]
			var firstCheck = getSubtraction2D(firstPoint, otherPoint)
			var distanceSquared = lengthSquared2D(firstCheck)
			if (distanceSquared < closestDistanceSquared && distanceSquared > 0.0) {
				if (getIsConnectionClear
				(distanceSquared, firstCheck, firstPoint, firstVertexIndex, polygons, otherPoint, otherFacetIndex, otherVertexIndex)) {
					closestDistanceSquared = distanceSquared
					connection.firstVertexIndex = firstVertexIndex
					connection.otherVertexIndex = otherVertexIndex
				}
			}
		}
	}

	var firstPointIndex = firstFacet[connection.firstVertexIndex]
	var otherFacet = facets[connection.otherFacetIndex]
	var otherPointIndex = otherFacet[connection.otherVertexIndex]
	var identicalVertexIndexes = getIdenticalVertexIndexes(firstFacet, firstPointIndex)
	if (identicalVertexIndexes.length > 1) {
		connection.firstVertexIndex = getOutsidestVertexIndex(firstFacet, identicalVertexIndexes, points[otherPointIndex], points)
	}

	identicalVertexIndexes = getIdenticalVertexIndexes(otherFacet, otherPointIndex)
	if (identicalVertexIndexes.length > 1) {
		connection.otherVertexIndex = getOutsidestVertexIndex(otherFacet, identicalVertexIndexes, points[firstPointIndex], points)
	}

	return connection
}

function getConvexFacet(facet, isClockwise, xyPoints) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var beginPoint = xyPoints[facet[(vertexIndex - 1 + facet.length) % facet.length]]
		var centerPoint = xyPoints[facet[vertexIndex]]
		var endPoint = xyPoints[facet[(vertexIndex + 1) % facet.length]]
		var centerBegin = getSubtraction2D(beginPoint, centerPoint)
		var centerBeginLength = length2D(centerBegin)
		var centerEnd = getSubtraction2D(endPoint, centerPoint)
		var centerEndLength = length2D(centerEnd)
		if (centerBeginLength > 0.0 && centerEndLength > 0.0) {
			divide2DScalar(centerBegin, centerBeginLength)
			divide2DScalar(centerEnd, centerEndLength)
			var bisector = getAddition2D(centerBegin, centerEnd)
			var bisectorLength = length2D(bisector)
			if (bisectorLength > gClose) {
				if (isClockwise == (crossProduct2D(centerBegin, centerEnd) < 0.0)) {
					var splitFacet = getSplitFacet(divide2DScalar(bisector, bisectorLength), facet, vertexIndex, xyPoints)
					if (splitFacet != undefined) {
						return splitFacet
					}
				}
			}
			else {
				if (isClockwise) {
					bisector = [-centerEnd[1], centerEnd[0]]
				}
				else {
					bisector = [centerEnd[1], -centerEnd[0]]
				}
				var splitFacet = getSplitFacet(bisector, facet, vertexIndex, xyPoints)
				if (splitFacet != undefined) {
					return splitFacet
				}
			}
		}
//		else {
//			if (centerBeginLength == 0.0) {
//				var polygon = getPolygonByFacet(facet, xyPoints)
//				noticeByList(['Identical points, centerBeginLength = 0.0 in polyhedron/getConvexFacet', polygon, beginPoint, centerPoint])
//			}
//			if (centerEndLength == 0.0) {
//				var polygon = getPolygonByFacet(facet, xyPoints)
//				noticeByList(['Identical points, centerEndLength = 0.0 in polyhedron/getConvexFacet', polygon, centerPoint, endPoint])
//			}
//		}
	}

	return undefined
}

function getConvexFacets(originalFacet, xyPoints) {
	var isClockwise = getIsClockwise(getPolygonByFacet(originalFacet, xyPoints))
	var facetCount = 0
	var convexFacets = [originalFacet.slice(0)]
	var whileMaximum = convexFacets[0].length
	for (var outerWhileCount = 0; outerWhileCount < whileMaximum; outerWhileCount++) {
		if (facetCount >= convexFacets.length) {
			break
		}
		for (var whileCount = 0; whileCount < whileMaximum; whileCount++) {
			var convexFacet = getConvexFacet(convexFacets[facetCount], isClockwise, xyPoints)
			if (convexFacet == undefined) {
				facetCount++
				break
			}
			else {
				convexFacets.push(convexFacet)
			}
		}
	}

	return convexFacets
}

function getConnectedFacet(facets, points) {
	while (facets.length > 1) {
		var connection = getClosestConnectionByFacets(facets, points)
		var firstFacet = getClosedFacet(connection.firstVertexIndex, facets[0])
		facets[0] = firstFacet.concat(getClosedFacet(connection.otherVertexIndex, facets[connection.otherFacetIndex]))
		facets.splice(connection.otherFacetIndex, 1)
	}
	return facets[0]
}

function getConnectedPolygon(polygons) {
	if (polygons.length == 1) {
		return polygons[0]
	}

	var mesh = getMeshByPolygons(polygons)
	return getPolygonByFacet(getConnectedFacet(mesh.facets, mesh.points), mesh.points)
}

function getConvex3DFacets(facet, points, xyPoints) {
	var normal = getNormalByFacet(facet, points)
	if (normal == undefined) {
		return [facet]
	}

	var axes = getAxesByNormal(normal)
	for (var pointIndex of facet) {
		xyPoints[pointIndex] = [points[pointIndex][axes[0]], points[pointIndex][axes[1]]]
	}

	return getConvexFacets(facet, xyPoints)
}

function getDoubleMeshArea(mesh) {
	var polygonArea = 0.0
	for (var facet of mesh.facets) {
		polygonArea += Math.abs(getDouble3DPolygonArea(getPolygonByFacet(facet, mesh.points)))
	}

	return polygonArea
}

function getEdgeKey(aString, bString) {
	if (bString > aString) {
		return aString + ' ' + bString
	}
	return bString + ' ' + aString
}

function getEdgesByFacet(facet, z, zList) {
	var edges = []
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var vertexIndexNext = (vertexIndex + 1) % facet.length
		var zVertex = zList[vertexIndex]
		var zNext = zList[vertexIndexNext]
		if (zVertex != z || zNext != z) {
			if (zVertex == z) {
				edges.push(facet[vertexIndex].toString())
			}
			else {
				if (zNext == z) {
					edges.push(facet[vertexIndexNext].toString())
				}
				else {
					if ((zVertex < z) != (zNext < z)) {
						edges.push(getEdgeKey(facet[vertexIndex].toString(), facet[vertexIndexNext].toString()))
					}
				}
			}
		}
	}
	if (edges.length < 2) {
		return undefined
	}
	if (edges[0] == edges[1]) {
		return undefined
	}
	return edges
}

function getEndMapByPolylines(polylines) {
	var endMap = new Map()
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		endMap.set(polylines[polylineIndex][0], polylineIndex)
	}
	return endMap
}

function getEndsBetween(mesh) {
	var centers = getCenters(mesh)
	var facets = mesh.facets
	var otherFacets = getArraysCopy(mesh.facets)
	var otherPoints = getArraysCopy(mesh.points)
	var points = mesh.points
	var minimumX = Number.MAX_VALUE
	var maximumX = -Number.MAX_VALUE
	for (var otherPoint of otherPoints) {
		minimumX = Math.min(minimumX, otherPoint[0])
		maximumX = Math.max(maximumX, otherPoint[0])
	}
	addArraysByIndex(otherPoints, maximumX - minimumX, 0)
	var otherCenters = getCenters({facets:otherFacets, points:otherPoints})
	var squaredDistances = new Array(centers.length)
	if (centers.length == 0 || otherCenters.length == 0) {
		return undefined
	}
	for (var centerIndex = 0; centerIndex < centers.length; centerIndex++) {
		var closestFacetDistanceSquared = Number.MAX_VALUE
		var closestFacetOtherIndex = undefined
		var center = centers[centerIndex]
		for (var otherIndex = 0; otherIndex < otherCenters.length; otherIndex++) {
			var distanceSquared = distanceSquared3D(center, otherCenters[otherIndex])
			if (distanceSquared < closestFacetDistanceSquared) {
				closestFacetOtherIndex = otherIndex
				closestFacetDistanceSquared = distanceSquared
			}
		}
		squaredDistances[centerIndex] = [closestFacetDistanceSquared, centerIndex, closestFacetOtherIndex]
	}
	squaredDistances.sort(compareFirstElementAscending)
	var squaredDistancesZero = squaredDistances[0]
	var closestSquared = squaredDistancesZero[0]
	var endIndex = 0
	for (var squaredDistanceIndex = 1; squaredDistanceIndex < squaredDistances.length; squaredDistanceIndex++) {
		var squaredDistance = squaredDistances[squaredDistanceIndex]
		if (squaredDistance[0] - closestSquared < gClose) {
			endIndex = squaredDistanceIndex
		}
		else {
			break
		}
	}
	endIndex += 1
	var rightFacets = []
	var leftFacets = []
	var betweenSet = new Set()
	var endsBetween = {leftAll:[], leftX:Number.MAX_VALUE, endVertexFacets:[], rightAll:[], rightX:-Number.MAX_VALUE}
	for (var facet of facets) {
		addElementsToSet(betweenSet, facet)
	}
	for (var squaredDistanceIndex = 0; squaredDistanceIndex < endIndex; squaredDistanceIndex++) {
		var squaredDistance = squaredDistances[squaredDistanceIndex]
		rightFacets.push(facets[squaredDistance[1]])
		facets[squaredDistance[1]] = []
		leftFacets.push(otherFacets[squaredDistance[2]])
		facets[squaredDistance[2]] = []
	}
	rightFacets = getJoinedFacets(rightFacets)
	leftFacets = getJoinedFacets(leftFacets)
	for (var connectedIndex = 0; connectedIndex < rightFacets.length; connectedIndex++) {
		var rightFacet = rightFacets[connectedIndex]
		var leftFacet = leftFacets[connectedIndex]
		deleteElementsFromSet(betweenSet, leftFacet)
		deleteElementsFromSet(betweenSet, rightFacet)
		var point = points[rightFacet[0]]
		var closestDistanceSquared = Number.MAX_VALUE
		var closestOtherVertexIndex = undefined
		for (var vertexIndex = 0; vertexIndex < leftFacet.length; vertexIndex++) {
			var distanceSquared = distanceSquared3D(point, otherPoints[leftFacet[vertexIndex]])
			if (distanceSquared < closestDistanceSquared) {
				closestOtherVertexIndex = vertexIndex
				closestDistanceSquared = distanceSquared
			}
		}
		var endVertexFacet = {closestOtherVertexIndex:closestOtherVertexIndex, leftFacet:leftFacet, rightFacet:rightFacet}
		endsBetween.endVertexFacets.push(endVertexFacet)
		pushArray(endsBetween.leftAll, leftFacet)
		pushArray(endsBetween.rightAll, rightFacet)
	}
	for (var pointIndex of endsBetween.leftAll) {
		var x = points[pointIndex][0]
		if (x < endsBetween.leftX) {
			endsBetween.leftX = x
		}
	}
	for (var pointIndex of endsBetween.rightAll) {
		var x = points[pointIndex][0]
		if (x > endsBetween.rightX) {
			endsBetween.rightX = x
		}
	}
	removeShortArrays(facets, 3)
	endsBetween.betweens = Array.from(betweenSet)
	endsBetween.leftFacetStart = facets.length
	pushArray(facets, leftFacets)
	endsBetween.rightFacetStart = facets.length
	pushArray(facets, rightFacets)
	return endsBetween
}

function getExtantIndex(nodeStrings, facetIntersection, facetVertexIndexes, meetingMap, points, toolPolygon, workMesh) {
	var meetingKey = nodeStrings[1]
	if (nodeStrings[0] == 't') {
		return getToolMeshIndexByFacet(parseInt(meetingKey), facetIntersection, facetVertexIndexes, toolPolygon, workMesh)
	}
	if (nodeStrings[0] == 'w') {
		return facetIntersection.facet[parseInt(meetingKey)]
	}
	var meeting = meetingMap.get(meetingKey)
	if (meeting.pointIndex == null) {
		meeting.pointIndex = points.length
		points.push(meeting.point)
	}
	if (meeting.isToolNode) {
		facetIntersection.toolMeshIndexMap.set(meeting.toolVertexIndex, meeting.pointIndex)
	}
	return meeting.pointIndex
}

function getFacetByWorkMap(facet, workMap) {
	for (var pointIndexIndex = 0; pointIndexIndex < facet.length; pointIndexIndex++) {
		var beginIndex = facet[pointIndexIndex]
		var endIndexIndex = (pointIndexIndex + 1) % facet.length
		var endIndex = facet[endIndexIndex]
		if (workMap.has(beginIndex) && workMap.has(endIndex)) {
			var between = []
			for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
				beginIndex = workMap.get(beginIndex)
				if (beginIndex == endIndex) {
					spliceArray(facet, endIndexIndex, between)
					return facet
				}
				between.push(beginIndex)
			}
			return facet
		}
	}
	return facet
}

function getFacetGroups(facets, points) {
	var polygons = getPolygonsByFacets(facets, points)
	var polygonIndexGroups = getPolygonIndexGroups(polygons)
	var facetGroups = new Array(polygonIndexGroups.length)
	for (var facetGroupIndex = 0; facetGroupIndex < facetGroups.length; facetGroupIndex++) {
		var polygonIndexGroup = polygonIndexGroups[facetGroupIndex]
		if (polygonIndexGroup.length == 1) {
			facetGroups[facetGroupIndex] = [facets[polygonIndexGroup]]
		}
		else {
			var facetGroup = new Array(polygonIndexGroup.length)
			for (var polygonIndex = 0; polygonIndex < facetGroup.length; polygonIndex++) {
				facetGroup[polygonIndex] = facets[polygonIndexGroup[polygonIndex]]
			}
			facetGroups[facetGroupIndex] = facetGroup
		}
	}
	return facetGroups
}

function getFacetVertexIndexes(polygon) {
	var facet = new Array(polygon.length)
	var vertexIndexes = new Array(polygon.length)
	var points = new Array(polygon.length)
	var pointStringMap = new Map()
	for (var vertexIndex = 0; vertexIndex < polygon.length; vertexIndex++) {
		var point = polygon[vertexIndex]
		var pointString = point.toString()
		if (pointStringMap.has(pointString)) {
			facet[vertexIndex] = pointStringMap.get(pointString)
		}
		else {
			facet[vertexIndex] = pointStringMap.size
			points[pointStringMap.size] = point
			vertexIndexes[pointStringMap.size] = vertexIndex
			pointStringMap.set(pointString, pointStringMap.size)
		}
	}

	points.length = pointStringMap.size
	vertexIndexes.length = pointStringMap.size
	return {facet:facet, length:pointStringMap.size, points:points, vertexIndexes:vertexIndexes}
}

function getIdenticalVertexIndexes(facet, pointIndex) {
	var identicalVertexIndexes = []
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		if (facet[vertexIndex] == pointIndex) {
			identicalVertexIndexes.push(vertexIndex)
		}
	}
	return identicalVertexIndexes
}

function getIsAFacetInStrata(facets, points, strata) {
	for (var facet of facets) {
		if (getIsFacetInStrata(facet, points, strata)) {
			return true
		}
	}
	return false
}

function getIsFacetInStrata(facet, points, strata) {
	if (getIsEmpty(facet)) {
		return false
	}

	for (var pointIndex of facet) {
		if (getIsInStrata(strata, points[pointIndex][2])) {
			return true
		}
	}

	return false
}

function getIsFacetPointingOutside(mesh) {
//	in future, improvement would be to take largest of the few top xFacets
	var facets = mesh.facets
	if (mesh.facets.length == 0) {
		return undefined
	}
	var points = mesh.points
	var xFacets = new Array(facets.length)
	var xNormal = [1.0, 0.0, 0.0]
	for (var facetIndex = 0; facetIndex < xFacets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		var xCloseness = -2
		if (normal != undefined) {
			xCloseness = dotProduct3D(normal, xNormal)
		}
		xFacets[facetIndex] = [xCloseness, facetIndex]
	}
	xFacets.sort(compareFirstElementDescending)
	var facet = facets[xFacets[0][1]]
	var polygon = getPolygonByFacet(facet, points)
	var xzPolygon = new Array(polygon.length)
	var yzPolygon = new Array(polygon.length)
	for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
		var point = polygon[pointIndex]
		xzPolygon[pointIndex] = [point[0], point[2]]
		yzPolygon[pointIndex] = [point[1], point[2]]
	}
	var yzPoint = getPointInsidePolygon(yzPolygon)
	var xIntersections = getXIntersectionsByMesh(mesh, yzPoint[0], yzPoint[1] + gClose)
	var numberOfIntersectionsToLeft = getNumberOfIntersectionsToLeft(getPointInsidePolygon(xzPolygon)[0] + gClose, xIntersections)
	if (numberOfIntersectionsToLeft == 0) {
		return undefined
	}

	return numberOfIntersectionsToLeft % 2 == 0
}

function getIsInStrata(strata, z) {
	if (getIsEmpty(strata)) {
		return true
	}

	var strataBottom = strata[0]
	if (strataBottom != null && strataBottom != undefined) {
		if (z < strataBottom) {
			return false
		}
	}

	var strataTop = strata[1]
	if (strata.length > 1) {
		if (strataTop != null && strataTop != undefined) {
			if (z > strataTop) {
				return false
			}
		}
	}

	return true
}

function getIsInStratas(stratas, z) {
	if (getIsEmpty(stratas)) {
		return true
	}

	for (var strata of stratas) {
		if (getIsInStrata(strata, z)) {
			return true
		}
	}

	return false
}

function getIsPolygonInStratas(polygon, stratas) {
	if (getIsEmpty(stratas)) {
		return true
	}

	for (var strata of stratas) {
		for (var point of polygon) {
			if (getIsInStrata(strata, point[2])) {
				return true
			}
		}
	}

	return false
}

function getJoinedFacetArrays(facets, points) {
	var facetsMap = new Map()
	var linkMap = new Map()
	var normals = new Array(facets.length)

	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var normal = getNormalByFacet(facet, points)
		if (normal != undefined) {
			normals[facetIndex] = normal
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var nextIndex = (vertexIndex + 1) % facet.length
				var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
				addElementToMapArray(facetsMap, edgeKey, facetIndex)
			}
		}
	}

	for (var facetIndexes of facetsMap.values()) {
		if (facetIndexes.length == 2) {
			var facetIndex0 = facetIndexes[0]
			var facetIndex1 = facetIndexes[1]
			if (distanceSquared3D(normals[facetIndex0], normals[facetIndex1]) < gCloseSquared) {
				addToLinkMap(facetIndex0, facetIndex1, linkMap)
			}
		}
	}

	var joinedMap = getJoinedMap(facets.length, linkMap)
	var joinedFacetArrays = new Array(joinedMap.size)
	var joinedFacetArraysLength = 0

	for (var joined of joinedMap.values()) {
		for (var facetIndexIndex = 0; facetIndexIndex < joined.length; facetIndexIndex++) {
			joined[facetIndexIndex] = facets[joined[facetIndexIndex]]
		}
		joinedFacetArrays[joinedFacetArraysLength++] = getJoinedFacets(joined)
	}

	return joinedFacetArrays
}

function getLoneArrowSet(facets) {
	var loneArrowSet = new Set()
	for (var facet of facets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var reverseStrings = [facet[(vertexIndex + 1) % facet.length], facet[vertexIndex]]
			var reverseKey = reverseStrings.join(' ')
			if (loneArrowSet.has(reverseKey)) {
				loneArrowSet.delete(reverseKey)
			}
			else {
				reverseStrings.reverse()
				loneArrowSet.add(reverseStrings.join(' '))
			}
		}
	}

	return loneArrowSet
}

function getMeetingMap(facetIntersections, toolPolygon, workMesh) {
	var arrowsMap = new Map()
	var facets = workMesh.facets
	var meetingMap = new Map()
	var points = workMesh.points
	var rotatedPointMap = new Map()
	for (var facetIntersection of facetIntersections) {
		var facet = facetIntersection.facet
		facetIntersection.alongIndexesMap = new Map()
		for (var pointIndex of facet) {
			rotatedPointMap.set(pointIndex, null)
		}
		for (var workVertexIndex = 0; workVertexIndex < facet.length; workVertexIndex++) {
			var pointBeginIndex = facet[workVertexIndex]
			var pointEndIndex = facet[(workVertexIndex + 1) % facet.length]
			var arrow = {
				facetIntersection:facetIntersection,
				facetLength:facet.length,
				workDirection:pointBeginIndex < pointEndIndex,
				workVertexIndex:workVertexIndex}
			addElementToMapArray(arrowsMap, getSemicolonEdgeKey(pointBeginIndex, pointEndIndex), arrow)
		}
	}
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
			for (var rotatedPointKey of rotatedPointMap.keys()) {
				rotatedPointMap.set(rotatedPointKey, getRotation2DVector(points[rotatedPointKey], reverseRotation))
			}
			for (var arrowsKey of arrowsMap.keys()) {
				var arrowsKeyStrings = arrowsKey.split(';')
				var workBeginIndex = parseInt(arrowsKeyStrings[0])
				var workEndIndex = parseInt(arrowsKeyStrings[1])
				var workBeginRotated = rotatedPointMap.get(workBeginIndex)
				var workEndRotated = rotatedPointMap.get(workEndIndex)
				var meetingKey = 'i;' + arrowsKey + ';' + toolBeginIndex
				var meeting = getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated)
				if (meeting != null) {
					var toolAlong = meeting.toolAlong
					if (meeting.isWorkNode) {
						if (meeting.workAlong < 0.5) {
							meeting.pointIndex = workBeginIndex
						}
						else {
							meeting.pointIndex = workEndIndex
						}
						meetingKey = 'w;' + meeting.pointIndex
						if (meetingMap.has(meetingKey)) {
							meeting = meetingMap.get(meetingKey)
						}
						else {
							meeting.point = points[meeting.pointIndex]
						}
					}
					else {
						if (meeting.isToolNode) {
							if (meeting.toolAlong < 0.5) {
								meeting.toolVertexIndex = toolBeginIndex
								meeting.oppositeToolVertexIndex = toolEndIndex
							}
							else {
								meeting.toolVertexIndex = toolEndIndex
								meeting.oppositeToolVertexIndex = toolBeginIndex
							}
							var meetingKey = 't;' + meeting.toolVertexIndex + ';' + arrowsKey
							if (meetingMap.has(meetingKey)) {
								meeting = meetingMap.get(meetingKey)
							}
							else {
								meeting.point = toolPolygon[meeting.toolVertexIndex].slice(0, 2)
								var z = points[workBeginIndex][2] * (1.0 - meeting.workAlong) + points[workEndIndex][2] * meeting.workAlong
								meeting.point.push(z)
								meeting.pointIndex = points.length
								points.push(meeting.point)
							}
						}
						else {
							meeting.point = getMultiplicationArrayScalar(points[workBeginIndex], (1.0 - meeting.workAlong))
							addArray(meeting.point, getMultiplicationArrayScalar(points[workEndIndex], meeting.workAlong))
							meeting.pointIndex = points.length
							points.push(meeting.point)
						}
					}
					for (var arrow of arrowsMap.get(arrowsKey)) {
						var alongIndexesMap = arrow.facetIntersection.alongIndexesMap
						var workAlong = meeting.workAlong
						if (!arrow.workDirection) {
							workAlong = 1.0 - workAlong
						}
						addMeetingToMap(
						toolAlong, alongIndexesMap, meeting.isToolNode, 't ', meetingKey, toolBeginIndex, toolPolygon.length)
						if (meeting.isWorkNode) {
							workAlong = 1.0 * (arrow.facetIntersection.facet[arrow.workVertexIndex] != meeting.pointIndex)
						}
						addMeetingToMap(
						workAlong, alongIndexesMap, meeting.isWorkNode, 'w ', meetingKey, arrow.workVertexIndex, arrow.facetLength)
					}
					meetingMap.set(meetingKey, meeting)
				}
			}
		}
	}
	return meetingMap
}

function getMeetingMapByHeight(facetSplits, splitHeight, workMesh) {
	var arrowsMap = new Map()
	var meetingMap = new Map()
	var points = workMesh.points
	for (var facetSplit of facetSplits) {
		var facet = facetSplit.facet
		facetSplit.alongIndexesMap = new Map()
		var normal = getNormalByFacet(facet, points)
		facetSplit.rightNormal = [normal[1], -normal[0]]
		facetSplit.toolAlongIndexes = []
		for (var workVertexIndex = 0; workVertexIndex < facet.length; workVertexIndex++) {
			var pointBeginIndex = facet[workVertexIndex]
			var pointEndIndex = facet[(workVertexIndex + 1) % facet.length]
			var arrow = {
				facetLength:facet.length,
				facetSplit:facetSplit,
				workDirection:pointBeginIndex < pointEndIndex,
				workVertexIndex:workVertexIndex}
			addElementToMapArray(arrowsMap, getSemicolonEdgeKey(pointBeginIndex, pointEndIndex), arrow)
		}
	}
	for (var arrowsKey of arrowsMap.keys()) {
		var arrowsKeyStrings = arrowsKey.split(';')
		var workBeginIndex = parseInt(arrowsKeyStrings[0])
		var workEndIndex = parseInt(arrowsKeyStrings[1])
		var meeting = getMeetingByHeight(splitHeight, points[workBeginIndex][2], points[workEndIndex][2])
		var meetingKey = 'i;' + arrowsKey
		if (meeting != null) {
			if (meeting.isWorkNode) {
				if (meeting.workAlong < 0.5) {
					meeting.pointIndex = workBeginIndex
				}
				else {
					meeting.pointIndex = workEndIndex
				}
				meetingKey = 'w;' + meeting.pointIndex
				if (meetingMap.has(meetingKey)) {
					meeting = meetingMap.get(meetingKey)
				}
				else {
					meeting.point = points[meeting.pointIndex]
				}
			}
			else {
				meeting.point = getMultiplication3DScalar(points[workBeginIndex], 1.0 - meeting.workAlong)
				add3D(meeting.point, getMultiplication3DScalar(points[workEndIndex], meeting.workAlong))
				meeting.pointIndex = points.length
			}
			points.push(meeting.point)
			for (var arrow of arrowsMap.get(arrowsKey)) {
				var alongIndexesMap = arrow.facetSplit.alongIndexesMap
				var workAlong = meeting.workAlong
				if (arrow.workDirection == false) {
					workAlong = 1.0 - workAlong
				}
				var toolAlong = dotProduct2D(arrow.facetSplit.rightNormal, meeting.point)
				arrow.facetSplit.toolAlongIndexes.push([toolAlong, meetingKey])
				if (meeting.isWorkNode) {
					workAlong = 1.0 * (arrow.facetSplit.facet[arrow.workVertexIndex] != meeting.pointIndex)
				}
				addMeetingToMap(
				workAlong, alongIndexesMap, meeting.isWorkNode, 'w ', meetingKey, arrow.workVertexIndex, arrow.facetLength)
			}
			meetingMap.set(meetingKey, meeting)
		}
	}
	for (var facetSplit of facetSplits) {
		facetSplit.toolAlongIndexes.sort(compareFirstElementAscending)
	}
	return meetingMap
}

function getMeshAnalysis(mesh, normal) {
	if (mesh == null) {
		return undefined
	}

	if (mesh.facets.length == 0) {
		return undefined
	}

	var arrowsMap = new Map()
	var attributeMap = new Map()
	var facetsMap = new Map()
	var linkMap = new Map()
	var loneEdges = []
	var greatestFacetVertexes = -1
	var moreThanDoubleEdges = []
	var numberOfEdges = 0
	var numberOfIdenticalPoints = 0
	var points = mesh.points
	var unidirectionalEdges = []
	var numberOfUnidirectionalEdges = 0
	var tooThinFacetsStrings = []
	for (var facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
		var facet = mesh.facets[facetIndex]
		if (facet.length > greatestFacetVertexes) {
			greatestFacetVertexes = facet.length
		}
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var vertex = facet[vertexIndex]
			var nextVertex = facet[nextIndex]
			if (points[vertex].toString() == points[nextVertex].toString()) {
				numberOfIdenticalPoints += 1
			}
			var edgeKey = getEdgeKey(vertex.toString(), nextVertex.toString())
			var arrow = vertex.toString() + ',' + nextVertex.toString()
			addElementToMapArray(arrowsMap, edgeKey, arrow)
			addElementToMapArray(facetsMap, edgeKey, facetIndex)
		}
	}
	addFirstTwoKeysToLinkMap(facetsMap, linkMap)
	for (var arrows of arrowsMap.values()) {
		numberOfEdges += 1
		if (arrows.length == 1) {
			loneEdges.push(arrows[0])
		}
		else {
			if (arrows.length > 2) {
				var moreThanDoubleEdgeStrings = []
				moreThanDoubleEdgeStrings.push('arrows:' + arrows.join(' '))
				var arrowStrings = arrows[0].split(',')
				var edgeKey = getEdgeKey(arrowStrings[0], arrowStrings[1])
				var facetIndexSet = new Set(facetsMap.get(edgeKey))
				for (var facetIndex of facetIndexSet) {
					var facet = mesh.facets[facetIndex]
					moreThanDoubleEdgeStrings.push('facet index:' + facetIndex + ' facet:' + facet.toString())
					var polygon = getPolygonByFacet(facet, points)
					moreThanDoubleEdgeStrings.push('polygon:' + polygon.join(' '))
				}
				for (var arrow of arrows) {
					var arrowIndexes = arrow.split(',')
					arrowIndexes.forEach(parseInt)
					moreThanDoubleEdgeStrings.push('arrowPoints:' + points[arrowIndexes[0]] + ', ' + points[arrowIndexes[1]])
				}
				moreThanDoubleEdges.push(moreThanDoubleEdgeStrings.join(' '))
			}
			else {
				if (arrows[0] == arrows[1]) {
					unidirectionalEdges.push(arrows[0])
				}
			}
		}
	}
	for (var facet of mesh.facets) {
		if (getNormalByFacet(facet, points) == undefined) {
			tooThinFacetsStrings.push('facet:' + facet.toString() + ' polygon:' + getPolygonByFacet(facet, points).join(' '))
		}
	}
	var isFacetPointingOutside = undefined
	var numberOfIncorrectEdges = loneEdges.length + moreThanDoubleEdges.length + unidirectionalEdges.length
	if (numberOfIncorrectEdges == 0) {
		isFacetPointingOutside = getIsFacetPointingOutside(mesh)
	}

	if (isFacetPointingOutside == undefined) {
		isFacetPointingOutside = 'Meaningless because mesh is incorrect.'
	}

	var numberOfErrors = numberOfIdenticalPoints + numberOfIncorrectEdges + tooThinFacetsStrings.length
	attributeMap.set('greatestFacetVertexes', greatestFacetVertexes.toString())
	attributeMap.set('isFacetPointingOutside', isFacetPointingOutside.toString())
	var meshBoundingBox = getMeshBoundingBox(mesh)
	attributeMap.set('area', (0.5 * getDoubleMeshArea(mesh)).toString())
	attributeMap.set('boundingBox', meshBoundingBox[0].toString() + ' ' + meshBoundingBox[1].toString())
	attributeMap.set('numberOfEdges', numberOfEdges.toString())
	attributeMap.set('numberOfFacets', mesh.facets.length.toString())
	attributeMap.set('numberOfShapes', getJoinedMap(mesh.facets.length, linkMap).size.toString())
	attributeMap.set('numberOfErrors', numberOfErrors.toString())
	if (numberOfErrors > 0) {
		attributeMap.set('numberOfIdenticalPoints', numberOfIdenticalPoints.toString())
		attributeMap.set('numberOfIncorrectEdges', numberOfIncorrectEdges.toString())
		attributeMap.set('numberOfTooThinFacets', tooThinFacetsStrings.length.toString())
	}

	if (loneEdges.length > 0) {
		loneEdgesString = loneEdges.join(' ')
		var loneIndexStringSet = new Set()
		for (var loneEdge of loneEdges) {
			addElementsToSet(loneIndexStringSet, loneEdge.split(','))
		}
		var loneIndexStrings = Array.from(loneIndexStringSet)
		loneIndexStrings.sort()
		for (var loneIndexString of loneIndexStrings) {
			var loneIndex = parseInt(loneIndexString)
			loneEdgesString += ' ' + loneIndex + ': ' + points[loneIndex]
		}
		attributeMap.set('loneEdges', loneEdgesString)
	}

	if (moreThanDoubleEdges.length > 0) {
		attributeMap.set('moreThanDoubleEdges', moreThanDoubleEdges.join(';'))
	}

	if (unidirectionalEdges.length > 0) {
		attributeMap.set('unidirectionalEdges', unidirectionalEdges.join(';'))
	}

	if (tooThinFacetsStrings.length > 0) {
		attributeMap.set('tooThinFacets', tooThinFacetsStrings.join(';'))
	}


	if (!getIsEmpty(normal)) {
		var dotPolygons = []
		for (var facet of mesh.facets) {
			var polygon = getPolygonByFacet(facet, points)
			var polygonNormal = getNormalByPolygon(polygon)
			if (polygonNormal != undefined) {
				var dotProduct = dotProduct3D(polygonNormal, normal)
				dotPolygons.push([dotProduct, facet, polygon])
			}
		}
		dotPolygons.sort(compareFirstElementDescending)
		var dotPolygonIndex = 1
		for (; dotPolygonIndex < dotPolygons.length; dotPolygonIndex++) {
			if (dotPolygons[dotPolygonIndex][0] < 0.5) {
				break
			}
		}
		var normalFacetStrings = []
		for (var normalIndex = 0; normalIndex < dotPolygonIndex; normalIndex++) {
			var dotPolygon = dotPolygons[normalIndex]
			normalFacetStrings.push('facet:' + dotPolygon[1].join(' ') + ' polygon:' + dotPolygon[2].join(' '))
		}
		attributeMap.set('normalFacetStrings', normalFacetStrings.join(';'))
	}

	return attributeMap
}

function getMeshBoundingBox(mesh) {
	var boundingBox = []
	var points = mesh.points
	for (var facet of mesh.facets) {
		for (var vertexIndex of facet) {
			var point = points[vertexIndex]
			if (!Number.isNaN(point[0])) {
				if (boundingBox.length == 0) {
					boundingBox = [point.slice(0), point.slice(0)]
				}
				else {
					widenBoundingBox(boundingBox, point)
				}
			}
		}
	}
	return boundingBox
}

function getMeshByLattice(lattice) {
	var lines = []
	var pointMap = new Map()
	var tipMap = new Map()
	var voxelMap = getVoxelMapByXYZLattice(lattice)
	addVoxelLines(2, voxelMap, lines, pointMap, tipMap)
	addVoxelLines(0, voxelMap, lines, pointMap, tipMap)
	addVoxelLines(1, voxelMap, lines, pointMap, tipMap)
	return getPolygonateMesh(getMeshByTipMap(pointMap, tipMap))
}

function getMeshByLines(id, lines) {
	var facet = []
	var facets = []
	var isSolid = false
	var pointMap = new Map()
	var points = []
	for (var line of lines) {
		var words = line.split(' ').filter(lengthCheck)
		if (words.length > 0) {
			var firstWord = words[0]
			if (isSolid) {
				if (words.length > 3) {
					if (firstWord == 'vertex') {
						point = [parseFloat(words[1]),parseFloat(words[2]),parseFloat(words[3])]
						var pointString = point.join(' ')
						if (pointMap.has(pointString)) {
							facet.push(pointMap.get(pointString))
						}
						else {
							var pointIndex = points.length
							pointMap.set(pointString, pointIndex)
							facet.push(pointIndex)
							points.push(point)
						}
					}
				}
				else {
					if (firstWord == 'endfacet') {
						facets.push(facet)
						facet = []
					}
					else {
						if (firstWord == 'endsolid') {
							return {facets:facets, points:points}
						}
					}
				}
			}
			else {
				if (words.length > 1) {
					if (firstWord == 'solid') {
						if (words[1] == id || id == undefined) {
							isSolid = true
						}
					}
				}
			}
		}
	}
	return undefined
}

function getMeshByPolygons(polygons) {
	var facets = new Array(polygons.length)
	var pointMap = new Map()
	var points = []
	for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
		var polygon = polygons[polygonIndex]
		var facet = new Array(polygon.length)
		for (var pointIndex = 0; pointIndex < polygon.length; pointIndex++) {
			var point = polygon[pointIndex]
			var pointString = point.join(',')
			if (pointMap.has(pointString)) {
				facet[pointIndex] = pointMap.get(pointString)
			}
			else {
				facet[pointIndex] = points.length
				pointMap.set(pointString, points.length)
				points.push(point)
			}
		}
		facets[polygonIndex] = facet
	}
	return {facets:facets, points:points}
}

function getMeshBySTL(id, stlInputString) {
//solid your_name 
//facet normal
//  outer loop
//    vertex
//    vertex
//    vertex
//  endloop
//endfacet
//endsolid
	var lines = stlInputString.split(getEndOfLine(stlInputString))
	var mesh = getMeshByLines(id, lines)
	if (mesh == undefined) {
		return getMeshByLines(undefined, lines)
	}
	return mesh
}

function getMeshByTSV(tsvInputString) {
	var rows = getBracketReplacedLinesByText(tsvInputString)
	for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
		rows[rowIndex] = rows[rowIndex].split('\t')
	}
	var spreadsheetArraysMap = getSpreadsheetArraysMap(rows)
	if (spreadsheetArraysMap.has('facets') && spreadsheetArraysMap.has('points')) {
		return {facets:spreadsheetArraysMap.get('facets'), points:spreadsheetArraysMap.get('points')}
	}
	return undefined
}

function getMeshCopy(mesh) {
	var meshCopy = {facets:getArraysCopy(mesh.facets), points:getArraysCopy(mesh.points)}
	if (mesh.intersectionIndexesMap != undefined) {
		meshCopy.intersectionIndexesMap = getMapArraysCopy(mesh.intersectionIndexesMap)
	}

	if (mesh.splitIndexesMap != undefined) {
		meshCopy.splitIndexesMap = getMapArraysCopy(mesh.splitIndexesMap)
	}

	return meshCopy
}

function getMeshString(date, filetype, id, mesh, project) {
	if (filetype.toLowerCase() == 'stl') {
		return getSTLMeshString(id, mesh)
	}
	if (filetype.toLowerCase() == 'tsv') {
		return getTSVMeshString(date, id, mesh, project)
	}
	return undefined
}

function getNormalByFacet(facet, points) {
	return getNormalByPolygon(getPolygonByFacet(facet, points))
}

function getOutsidestVertexIndex(facet, identicalVertexIndexes, otherPoint, points) {
	var centerPoint = points[facet[identicalVertexIndexes[0]]]
	var outsidestVertexIndex = undefined
	var centerOther = getSubtraction2D(otherPoint, centerPoint)
	var maximumDotProduct = -Number.MAX_VALUE
	for (var vertexIndex of identicalVertexIndexes) {
		var beginPoint = points[facet[(vertexIndex - 1 + facet.length) % facet.length]]
		var centerBegin = normalize2D(getSubtraction2D(beginPoint, centerPoint))
		var endPoint = points[facet[(vertexIndex + 1) % facet.length]]
		var centerEnd = normalize2D(getSubtraction2D(endPoint, centerPoint))
		var beginProximity = getDirectionalProximity(centerOther, centerBegin)
		var endProximity = getDirectionalProximity(centerOther, centerEnd)
		var maxMinusMin = Math.max(beginProximity, endProximity) - Math.min(beginProximity, endProximity)
//		var dotProduct = dotProduct2D(centerOther, centerBegin) + dotProduct2D(centerOther, centerEnd)
//maxMinusMin = dotProduct2D(centerOther, centerBegin) + dotProduct2D(centerOther, centerEnd)
		if (maxMinusMin > maximumDotProduct) {
//		if (dotProduct > maximumDotProduct) {
			maximumDotProduct = maxMinusMin
//			maximumDotProduct = dotProduct
			outsidestVertexIndex = vertexIndex
		}
	}
	return outsidestVertexIndex
}

function getPointAlongEdge(edge, points, z) {
	var nodes = edge.split(' ')
	var begin = points[nodes[0]]
	if (nodes.length == 1) {
		return begin.slice(0, 2)
	}
	var end = points[nodes[1]]
	var endZ = end[2]
	return get2DByPortion((endZ - z) / (endZ - begin[2]), begin, end)
}

//deprecated23 uses should be replaced with polygonateMesh
function getPolygonateMesh(mesh) {
	// when making a new mesh by construction, all indexes should be deleted
	var meshCopy = getMeshCopy(mesh)
	polygonateMesh(meshCopy)
	return meshCopy
}

function getPolylinesByFacet(facet, skipSet) {
	var startIndex = undefined
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		if (skipSet.has(vertexIndex)) {
			startIndex = vertexIndex
			break
		}
	}
	var polyline = undefined
	var polylines = []
	for (var extraIndex = 0; extraIndex < facet.length + 1; extraIndex++) {
		var vertexIndex = (startIndex + extraIndex) % facet.length
		var pointIndex = facet[vertexIndex]
		if (skipSet.has(vertexIndex)) {
			if (polyline != undefined) {
				polyline.push(pointIndex)
				polyline = undefined
			}
		}
		else {
			if (polyline == undefined) {
				polyline = [pointIndex]
				polylines.push(polyline)
			}
			else {
				polyline.push(pointIndex)
			}
		}
	}
	return polylines
}

function getSemicolonEdgeKey(aString, bString) {
	if (bString > aString) {
		return aString + ';' + bString
	}
	return bString + ';' + aString
}

function getSeparatedPolygons(polygon) {
	var facetVertexIndexes = getFacetVertexIndexes(polygon)
	if (polygon.length == facetVertexIndexes.length) {
		return [polygon]
	}

	var skipSet = getSkipSet(facetVertexIndexes.facet)
	var polylines = getPolylinesByFacet(facetVertexIndexes.facet, skipSet)
	var endMap = getEndMapByPolylines(polylines)
	var separatedPolygons = []
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		var polyline = polylines[polylineIndex]
		endPolylineIndex = endMap.get(polyline[polyline.length - 1])
		polyline.pop()
		if (endPolylineIndex == polylineIndex) {
			if (polyline.length > 2) {
				separatedPolygons.push(getPolygonByFacet(getPolygonByFacet(polyline, facetVertexIndexes.vertexIndexes), polygon))
			}
			endMap.delete(polyline[0])
		}
		else {
			pushArray(polyline, polylines[endPolylineIndex])
			polylines[endPolylineIndex] = polyline
			endMap.set(polyline[0], endPolylineIndex)
		}
	}

	if (separatedPolygons.length == 0) {
		return [polygon]
	}

	var smallestArea = Number.MAX_VALUE
	var smallestIndex = 0
	for (var polygonIndex = 0; polygonIndex < separatedPolygons.length; polygonIndex++) {
		var area = Math.abs(getDoublePolygonArea(separatedPolygons[polygonIndex]))
		if (area < smallestArea) {
			smallestArea = area
			smallestIndex = polygonIndex
		}
	}

	// smallest separatedPolygons are first so getConnectedFacet looks for distances from smallest polygon first
	var smallestPolygon = separatedPolygons[smallestIndex]
	separatedPolygons.splice(smallestIndex, 1)
	separatedPolygons.splice(0, 0, smallestPolygon)
	return separatedPolygons
}

function getSlicePolygonsByZ(mesh, z) {
	var facets = mesh.facets
	var arrowsMap = new Map()
	var points = mesh.points
	for (var facet of facets) {
		var zList = new Array(facet.length)
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			zList[vertexIndex] = points[facet[vertexIndex]][2]
		}
		var edges = getEdgesByFacet(facet, z, zList)
		if (edges != undefined) {
			addToArrowsMap(arrowsMap, edges)
		}
	}
	return getSlicePolygonsByArrowsMap(arrowsMap, points, z)
}

function getSlicePolygonsMapByMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var xyPolygonsMap = new Map()
	for (var facet of facets) {
		var zList = []
		var maximumZ = -Number.MAX_VALUE
		var minimumZ = Number.MAX_VALUE
		for (var vertex of facet) {
			var z = points[vertex][2]
			zList.push(z)
			maximumZ = Math.max(maximumZ, z)
			minimumZ = Math.min(minimumZ, z)
		}
		maximumZ = Math.floor(maximumZ + 1.001)
		minimumZ = Math.ceil(minimumZ)
		for (var z = minimumZ; z < maximumZ; z++) {
			var edges = getEdgesByFacet(facet, z, zList)
			if (edges != undefined) {
				var arrowsMap = undefined
				if (xyPolygonsMap.has(z)) {
					arrowsMap = xyPolygonsMap.get(z)
				}
				else {
					arrowsMap = new Map()
					xyPolygonsMap.set(z, arrowsMap)
				}
				addToArrowsMap(arrowsMap, edges)
			}
		}
	}
 	for (var entry of xyPolygonsMap) {
		var z = entry[0]
		xyPolygonsMap.set(z, getSlicePolygonsByArrowsMap(entry[1], points, z))
	}
	return xyPolygonsMap
}

function getSplitFacet(bisector, facet, vertexIndex, xyPoints) {
	var distanceExtras = []
	var polygon = getPolygonByFacet(facet, xyPoints)
	var point = polygon[vertexIndex]
	for (var extraIndex = 2; extraIndex < facet.length - 1; extraIndex++) {
		var checkIndex = (vertexIndex + extraIndex) % facet.length
		var checkPoint = polygon[checkIndex]
		var distanceSquared = distanceSquared2D(point, checkPoint)
		if (dotProduct2D(bisector, getSubtraction2D(point, checkPoint)) > gClose) {
			distanceExtras.push([distanceSquared, checkIndex])
		}
	}

	distanceExtras.sort(compareFirstElementAscending)
	for (var distanceExtra of distanceExtras) {
		var checkIndex = distanceExtra[1]
		var checkPoint = polygon[checkIndex]
		var pointCheck = getSubtraction2D(point, checkPoint)
		var reverseRotation = [pointCheck[0], -pointCheck[1]]
		var polygonRotated = getRotation2DsVector(polygon, reverseRotation)
		var polygonSliceRotated = getPolygonSlice(polygonRotated, (vertexIndex + 1) % polygon.length, checkIndex)
		var xIntersections = []
		var pointRotated = polygonRotated[vertexIndex]
		var y = pointRotated[1]
		addXIntersectionsByPolylineClose(xIntersections, polygonSliceRotated, y)
		polygonSliceRotated = getPolygonSlice(polygonRotated, (checkIndex + 1) % polygon.length, vertexIndex)
		addXIntersectionsByPolylineClose(xIntersections, polygonSliceRotated, y)
		if (getIsClear(pointRotated[0], polygonRotated[checkIndex][0], xIntersections)) {
			var splitFacet = getPolygonSlice(facet, vertexIndex, (checkIndex + 1) % facet.length)
			overwriteArray(facet, getPolygonSlice(facet, checkIndex, (vertexIndex + 1) % facet.length))
			return splitFacet
		}
	}

	return undefined
}

function getSpreadsheetArraysMap(rows) {
	var spreadsheetArraysMap = new Map()
	var arrays = undefined
	var arraysNumber = 0
	for (var spreadsheetRowIndex = 0; spreadsheetRowIndex < rows.length; spreadsheetRowIndex++) {
		var row = rows[spreadsheetRowIndex]
		if (row.length > 0) {
			if (arrays == undefined) {
				if (row[0] == '_arrays') {
					arrays = []
					if (row.length > 1) {
						spreadsheetArraysMap.set(row[1], arrays)
					}
					else {
						spreadsheetArraysMap.set(arraysNumber.toString(), arrays)
						arraysNumber++
					}
				}
			}
			else {
				if (row[0].startsWith('_end')) {
					arrays = undefined
				}
				else {
					arrays.push(row)
				}
			}
		}
	}
	return spreadsheetArraysMap
}

function getSTLMeshString(id, mesh) {
//solid your_name 
//facet normal
//  outer loop
//    vertex
//    vertex
//    vertex
//  endloop
//endfacet
//endsolid
	var mesh = getTriangleMesh(mesh)
	var meshStrings = ['solid ' + id]
	var points = mesh.points
	for (var facet of mesh.facets) {
		var normal = getNormalByFacet(facet, points)
		var normalString = 'facet'
		if (normal != undefined) {
			normalString += ' normal ' + getFixedStrings(normal, 3).join(' ')
		}
		meshStrings.push(normalString)
		meshStrings.push('  outer loop')
		for (var pointIndex of facet) {
			meshStrings.push('    vertex ' + getFixedStrings(points[pointIndex], 8).join(' '))
		}
		meshStrings.push('  endloop')
		meshStrings.push('endfacet')
	}
	meshStrings.push('endsolid')
	return meshStrings.join('\n')
}

function getToolMap(facetIntersections, points, toolPolygon) {
	var toolMap = new Map()
	for (var toolBeginIndex = 0; toolBeginIndex < toolPolygon.length; toolBeginIndex++) {
		var zFacets = []
		for (var facetIntersection of facetIntersections) {
			if (facetIntersection.toolMeshIndexMap.has(toolBeginIndex)) {
				var pointIndex = facetIntersection.toolMeshIndexMap.get(toolBeginIndex)
				zFacets.push([points[pointIndex][2], pointIndex, facetIntersection])
			}
		}
		zFacets.sort(compareFirstElementAscending)
		for (var zFacetIndex = 1; zFacetIndex < zFacets.length; zFacetIndex++) {
			var bottomZFacet = zFacets[zFacetIndex - 1]
			var topZFacet = zFacets[zFacetIndex]
			if (!bottomZFacet[2].isToolReversed && topZFacet[2].isToolReversed) {
				toolMap.set(bottomZFacet[1], topZFacet[1])
				toolMap.set(topZFacet[1], bottomZFacet[1])
			}
		}
	}
	return toolMap
}

function getToolMeshIndex(directedIndex, facetIntersection, toolPolygon, workMesh) {
	var toolPoint = toolPolygon[directedIndex]
	var points = workMesh.points
	var facetPolygon = getPolygonByFacet(facetIntersection.facet, points)
	var pointsLength = points.length
	facetIntersection.toolMeshIndexMap.set(directedIndex, pointsLength)
	points.push([toolPoint[0], toolPoint[1], getZByPointPolygon(toolPoint, facetPolygon)])
	return pointsLength
}

function getTriangle3DFacets(facet, points, xyPoints) {
	if (facet.length < 4) {
		return [facet]
	}

	var convexFacets = getConvex3DFacets(facet, points, xyPoints)
	var convexFacetsLength = convexFacets.length
	for (var convexFacetIndex = 0; convexFacetIndex < convexFacetsLength; convexFacetIndex++) {
		var facet = convexFacets[convexFacetIndex]
		if (facet.length > 3) {
			var dotProducts = new Array(facet.length)
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var beginPoint = xyPoints[facet[(vertexIndex - 1 + facet.length) % facet.length]]
				var centerPoint = xyPoints[facet[vertexIndex]]
				var endPoint = xyPoints[facet[(vertexIndex + 1) % facet.length]]
				var centerBegin = getSubtraction2D(beginPoint, centerPoint)
				var centerBeginLength = length2D(centerBegin)
				var centerEnd = getSubtraction2D(endPoint, centerPoint)
				var centerEndLength = length2D(centerEnd)
				if (centerBeginLength > 0.0 && centerEndLength > 0.0) {
					divide2DScalar(centerBegin, centerBeginLength)
					divide2DScalar(centerEnd, centerEndLength)
					dotProducts[vertexIndex] = dotProduct2D(centerBegin, centerEnd)
				}
				else {
					dotProducts[vertexIndex] = -2
				}
			}
			var farthestIndex = undefined
			var greatestProduct = -Number.MAX_VALUE
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var minimumProduct = Math.min(dotProducts[(vertexIndex - 1 + facet.length) % facet.length], dotProducts[vertexIndex])
				minimumProduct = Math.min(minimumProduct, dotProducts[(vertexIndex + 1) % facet.length])
				if (minimumProduct > greatestProduct) {
					greatestProduct = minimumProduct
					farthestIndex = vertexIndex
				}
			}
			for (var extraIndex = 3; extraIndex < facet.length; extraIndex++) {
				var secondIndex = (farthestIndex + extraIndex - 1) % facet.length
				var thirdIndex = (farthestIndex + extraIndex) % facet.length
				convexFacets.push([facet[farthestIndex], facet[secondIndex], facet[thirdIndex]])
			}
			var secondIndex = (farthestIndex + 1) % facet.length
			var thirdIndex = (farthestIndex + 2) % facet.length
			overwriteArray(facet, [facet[farthestIndex], facet[secondIndex], facet[thirdIndex]])
		}
	}

	return convexFacets
}

function getTriangleMesh(mesh) {
	return {facets:getAllTriangleFacets(mesh), points:mesh.points}
}

function getTSVMeshString(date, id, mesh, project) {
	var meshStrings = ['_format\tsolid']
	if (!getIsEmpty(date)) {
		meshStrings.push('date\t' + date)
	}
	meshStrings.push('name\t' + id)
	if (!getIsEmpty(project)) {
		meshStrings.push('project\t' + project)
	}
	addArraysToSpreadsheetStrings(mesh.points, 'points', meshStrings)
	addArraysToSpreadsheetStrings(mesh.facets, 'facets', meshStrings)
	return meshStrings.join('\n')
}

function getVertexIndex(facet, pointIndex) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		if (facet[vertexIndex] == pointIndex) {
			return vertexIndex
		}
	}

	return undefined
}

function getXIntersectionsByMesh(mesh, y, z) {
	var xIntersections = []
	var xyPolygons = getSlicePolygonsByZ(mesh, z)
	for (var xyPolygon of xyPolygons) {
		addXIntersectionsByPolygon(xIntersections, xyPolygon, y)
	}
	return xIntersections
}

function joinFacets(joinedFacets, closestJoinedFacet, otherMeshFacets, closestOtherFacet, points) {
	var point = points[closestJoinedFacet[0]]
	var closestDistanceSquared = Number.MAX_VALUE
	var closestOtherVertexIndex = undefined
	for (var vertexIndex = 0; vertexIndex < closestOtherFacet.length; vertexIndex++) {
		var distanceSquared = distanceSquared3D(point, points[closestOtherFacet[vertexIndex]])
		if (distanceSquared < closestDistanceSquared) {
			closestOtherVertexIndex = vertexIndex
			closestDistanceSquared = distanceSquared
		}
	}
	var joinedArrowMap = getArrowMap(joinedFacets)
	var otherArrowMap = getArrowMap(otherMeshFacets)
	var connectionMap = new Map()
	var pairMap = new Map()
	for (var vertexIndex = 0; vertexIndex < closestJoinedFacet.length; vertexIndex++) {
		var pointIndex = closestJoinedFacet[vertexIndex]
		var nextPointIndex = closestJoinedFacet[(vertexIndex + 1) % closestJoinedFacet.length]
		var facetIndex = joinedArrowMap.get(nextPointIndex + ' ' + pointIndex)
		var otherVertexIndex = (closestOtherVertexIndex - vertexIndex + closestOtherFacet.length) % closestOtherFacet.length
		var otherPointIndex = closestOtherFacet[otherVertexIndex]
		var nextOtherPointIndex = closestOtherFacet[(otherVertexIndex - 1 + closestOtherFacet.length) % closestOtherFacet.length]
		var otherFacetIndex = otherArrowMap.get(otherPointIndex + ' ' + nextOtherPointIndex)
		connectionMap.set(otherPointIndex, pointIndex)
		pairMap.set(facetIndex, otherFacetIndex)
	}
	var collinearities = new Array(points.length).fill(false)
	for (var facetIndex of pairMap.keys()) {
		var facet = joinedFacets[facetIndex]
		var otherFacetIndex = pairMap.get(facetIndex)
		var otherFacet = otherMeshFacets[otherFacetIndex]
		for (var vertexIndex = 0; vertexIndex < otherFacet.length; vertexIndex++) {
			var otherPointIndex = otherFacet[vertexIndex]
			if (connectionMap.has(otherPointIndex)) {
				otherFacet[vertexIndex] = connectionMap.get(otherPointIndex)
			}
		}
		var joinedFacet = getJoinedFacets([facet, otherFacet])[0]
		for (var pointIndex of joinedFacet) {
			collinearities[pointIndex] = true
		}
		joinedFacets[facetIndex] = joinedFacet
		otherMeshFacets[otherFacetIndex] = []
	}
	for (var joinedFacet of joinedFacets) {
		addFacetToCollinearities(collinearities, joinedFacet, points)
	}
	removeCollinearPointsByFacets(collinearities, joinedFacets)
}

function joinMeshes(matrices, matrix3D, meshes) {
	if (getIsEmpty(meshes)) {
		return undefined
	}
	var joinedMesh = meshes[0]
	if (!getIsEmpty(matrices)) {
		joinedMesh.points = get3DsByMatrix3D(joinedMesh.points, matrix3D)
	}
	for (var meshesIndex = 1; meshesIndex < meshes.length; meshesIndex++) {
		var otherMesh = meshes[meshesIndex]
		if (getIsEmpty(matrices)) {
			addMeshToJoinedMesh(joinedMesh, getMeshCopy(otherMesh))
		}
		else {
			for (var matrix of matrices) {
				if (!isUnitMatrix(matrix)) {
					var otherMeshCopy = getMeshCopy(otherMesh)
					otherMeshCopy.points = get3DsByMatrix3D(otherMeshCopy.points, matrix3D)
					transform2DOr3DPoints(matrix, otherMeshCopy.points)
					addMeshToJoinedMesh(joinedMesh, otherMeshCopy)
				}
			}
		}
	}
	if (!getIsEmpty(matrices)) {
		joinedMesh.points = get3DsByMatrix3D(joinedMesh.points, getInverseRotationTranslation3D(matrix3D))
	}
}

function nullifyFacets(facets, indexBegin, indexEnd) {
	for (var facetIndex = indexBegin; facetIndex < indexEnd; facetIndex++) {
		facets[facetIndex] = []
	}
}

function polygonateFacets(facets, points) {
	var joinedFacetArrays = getJoinedFacetArrays(facets, points)
	for (var joinedFacets of joinedFacetArrays) {
		if (joinedFacets.length > 0) {
			overwriteArray(joinedFacets, joinedFacets[0])
		}
	}
	overwriteArray(facets, joinedFacetArrays)
}

function polygonateMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var joinedFacetArrays = getJoinedFacetArrays(facets, points)
	var collinearities = new Array(points.length).fill(true)
	for (var joinedFacets of joinedFacetArrays) {
		for (var joinedFacet of joinedFacets) {
			addFacetToCollinearities(collinearities, joinedFacet, points)
		}
	}

	for (var joinedFacets of joinedFacetArrays) {
		if (joinedFacets.length > 0) {
			removeCollinearPointsByFacets(collinearities, joinedFacets)
			var normal = getNormalByFacet(joinedFacets[0], points)
			var points2D = undefined
			if (normal == undefined) {
				points2D = points
			}
			else {
				var axes = getAxesByNormal(normal)
				points2D = new Array(points.length)
				for (var facet of joinedFacets) {
					for (var pointIndex of facet) {
						points2D[pointIndex] = [points[pointIndex][axes[0]], points[pointIndex][axes[1]]]
					}
				}
			}
			overwriteArray(joinedFacets, getConnectedFacet(joinedFacets, points2D))
		}
	}

	removeShortArrays(joinedFacetArrays, 3)
	overwriteArray(mesh.facets, joinedFacetArrays)
	removeUnfacetedPoints(mesh)
	return mesh
}

function removeArrowFromMap(arrows, arrowsMap, key) {
	if (arrows.length == 1) {
		arrowsMap.set(key, null)
	}
	else {
		arrows.shift()
	}
}

function removeUnfacetedPoints(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	removeUndefineds(facets)
	var pointIndexes = new Array(points.length)
	for (var facet of facets) {
		for (var pointIndex of facet) {
			pointIndexes[pointIndex] = true
		}
	}

	var pointLength = 0
	for (var pointIndexIndex = 0; pointIndexIndex < pointIndexes.length; pointIndexIndex++) {
		if (pointIndexes[pointIndexIndex]) {
			pointIndexes[pointIndexIndex] = pointLength
			points[pointLength++] = points[pointIndexIndex]
		}
	}

	points.length = pointLength
	updateFacetsByPointIndexes(facets, pointIndexes)
	if (mesh.intersectionIndexesMap != undefined) {
		updateFacetsByPointIndexes(mesh.intersectionIndexesMap.values(), pointIndexes)
	}

	if (mesh.splitIndexesMap != undefined) {
		updateFacetsByPointIndexes(mesh.splitIndexesMap.values(), pointIndexes)
	}
}

function sortAlongIndexesMapByFacetIntersections(facetIntersections) {
	for (var facetIntersection of facetIntersections.values()) {
		sortAlongIndexesMap(facetIntersection.alongIndexesMap)
	}
}

function sortVertically(alongIndexesMap, meetingMap, toolPolygon, workPolygon) {
	var workNormal = getNormalByPolygon(workPolygon)
	for (var alongIndexesEntry of alongIndexesMap) {
		var alongIndexesKeyStrings = alongIndexesEntry[0].split(' ')
		if (alongIndexesKeyStrings[0] == 't') {
			var alongIndexes = alongIndexesEntry[1]
			var toolIndex = parseInt(alongIndexesKeyStrings[1])
			var toolNormal = getSubtraction2D(toolPolygon[(toolIndex + 1) % toolPolygon.length], toolPolygon[toolIndex])
			var heightMultiplier = 1.0 - 2.0 * (dotProduct2D(workNormal, toolNormal) < 0.0)
			for (var alongIndex of alongIndexes) {
				alongIndex.push(heightMultiplier * meetingMap.get(alongIndex[1]).point[2])
			}
			alongIndexes.sort(compareFirstThirdElementAscending)
		}
	}
}

function updateFacetByPointIndexes(facet, pointIndexes) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		facet[vertexIndex] = pointIndexes[facet[vertexIndex]]
	}
}

function updateFacetsByPointIndexes(facets, pointIndexes) {
	for (var facet of facets) {
		updateFacetByPointIndexes(facet, pointIndexes)
	}
}

function updateFacetByPointMap(facet, pointIndexMap) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		if (pointIndexMap.has(facet[vertexIndex])) {
			facet[vertexIndex] = pointIndexMap.get(facet[vertexIndex])
		}
	}
}

function updateFacetsByPointMap(facets, pointIndexMap) {
	for (var facet of facets) {
		updateFacetByPointMap(facet, pointIndexMap)
	}
}

function updateMeshByPointMap(mesh, pointIndexMap) {
	updateFacetsByPointMap(mesh.facets, pointIndexMap)
	if (mesh.intersectionIndexesMap != undefined) {
		updateFacetsByPointMap(mesh.intersectionIndexesMap.values(), pointIndexMap)
	}
	if (mesh.splitIndexesMap != undefined) {
		updateFacetsByPointMap(mesh.splitIndexesMap.values(), pointIndexMap)
	}
}
