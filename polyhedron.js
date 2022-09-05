//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

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

function addFacetsByFacetSplit(facets, facetSplit, meetings, xzPoints, points) {
	var arcMap = new Map()
	var facet = facetSplit.facet
	var workPolygon = getPolygonByFacet(facet, xzPoints)
	var toolAlongIndexes = facetSplit.toolAlongIndexes
	var toolBeginMap = new Map()
	var toolEndMap = new Map()
	var toolLineSet = new Set()
	var toolIndexSet = new Set()
	addMeetingsToFacet(facetSplit.alongIndexesMap, facet, meetings)
	for (var toolAlongIndex of toolAlongIndexes) {
		toolIndexSet.add(meetings[toolAlongIndex[1]].pointIndex)
	}
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var beginIndex = facet[vertexIndex]
		var endIndex = facet[(vertexIndex + 1) % facet.length]
		if (toolIndexSet.has(beginIndex) && toolIndexSet.has(endIndex)) {
			toolLineSet.add(getEdgeKey(beginIndex, endIndex))
		}
	}
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var beginIndex = facet[(vertexIndex + 1) % facet.length]
		var endIndex = facet[(vertexIndex + 2) % facet.length]
		var key = beginIndex + ' ' + endIndex
		arcMap.set(key, [facet[vertexIndex], facet[(vertexIndex + 3) % facet.length]])
		if (toolIndexSet.has(beginIndex)) {
			toolBeginMap.set(beginIndex, key)
		}
		if (toolIndexSet.has(endIndex)) {
			toolEndMap.set(endIndex, key)
		}
	}
	for (var toolAlongIndexesIndex = 0; toolAlongIndexesIndex < toolAlongIndexes.length - 1; toolAlongIndexesIndex++) {
		var beginMeeting = meetings[toolAlongIndexes[toolAlongIndexesIndex][1]]
		var endMeeting = meetings[toolAlongIndexes[toolAlongIndexesIndex + 1][1]]
		var beginKey = beginMeeting.pointIndex
		var endKey = endMeeting.pointIndex
		if (!toolLineSet.has(getEdgeKey(beginKey, endKey))) {
			var midpoint = multiply2DByScalar(get2DAddition(beginMeeting.xzPoint, endMeeting.xzPoint), 0.5)
			if (getIsPointInsidePolygonOrClose(midpoint, workPolygon)) {
				var beginEntryKey = toolEndMap.get(beginKey)
				var beginExitKey = toolBeginMap.get(beginKey)
				var endEntryKey = toolEndMap.get(endKey)
				var endExitKey = toolBeginMap.get(endKey)
				arcMap.set(beginKey + ' ' + endKey, [parseInt(beginEntryKey.split(' ')[0]), parseInt(endExitKey.split(' ')[1])])
				arcMap.set(endKey + ' ' + beginKey, [parseInt(endEntryKey.split(' ')[0]), parseInt(beginExitKey.split(' ')[1])])
				arcMap.get(beginEntryKey)[1] = endKey
				arcMap.get(beginExitKey)[0] = endKey
				arcMap.get(endEntryKey)[1] = beginKey
				arcMap.get(endExitKey)[0] = beginKey
				toolAlongIndexesIndex += 1
			}
		}
	}
	var joinedFacets = getJoinedFacetsByArcMap(arcMap)
	overwriteArray(facet, joinedFacets[0])
	for (var joinedFacetIndex = 1; joinedFacetIndex < joinedFacets.length; joinedFacetIndex++) {
		facets.push(joinedFacets[joinedFacetIndex])
	}
}

function addFacetsByToolWorkMaps(facets, toolMap, workMap) {
	for (var key of workMap.keys()) {
		var nextIndex = workMap.get(key)
		if (nextIndex != null) {
			var facet = []
			var isHorizontal = true
			facets.push(facet)
			workMap.set(key, null)
			for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
				if (nextIndex == null) {
					break
				}
				facet.push(key)
				key = nextIndex
				if (isHorizontal) {
					if (toolMap.has(key)) {
						nextIndex = toolMap.get(key)
						toolMap.set(key, null)
						isHorizontal = false
					}
					else {
						nextIndex = workMap.get(key)
						workMap.set(key, null)
					}
				}
				else {
					if (workMap.has(key)) {
						nextIndex = workMap.get(key)
						workMap.set(key, null)
						isHorizontal = true
					}
					else {
						nextIndex = toolMap.get(key)
						toolMap.set(key, null)
					}
				}
			}
		}
	}
}

//deprecated23
function addFacetToSetByLine(beginIndex, closeFacetSet, endIndex, facetIntersectionIndex, facetIntersections, facets) {
	var facet = facets[facetIntersections[facetIntersectionIndex].facetIndex]
	for (var facetPointIndex = 0; facetPointIndex < facet.length; facetPointIndex++) {
		var pointIndex = facet[facetPointIndex]
		var previousPointIndex = facet[(facetPointIndex + facet.length - 1) % facet.length]
		if (pointIndex == beginIndex && previousPointIndex == endIndex) {
			closeFacetSet.add(facetIntersectionIndex)
			return
		}
	}
}

//deprecated23
function addFacetToSetByPoint(closeFacetSet, facetIntersectionIndex, facetIntersections, facets, pointIndex) {
	var facet = facets[facetIntersections[facetIntersectionIndex].facetIndex]
	for (var facetPointIndex = 0; facetPointIndex < facet.length; facetPointIndex++) {
		if (facet[facetPointIndex] == pointIndex) {
			closeFacetSet.add(facetIntersectionIndex)
			return
		}
	}
}

function addMeetingsToFacet(alongIndexesMap, facet, meetings) {
	sortRemoveMeetings(alongIndexesMap, meetings)
	for (var vertexIndex = facet.length - 1; vertexIndex > -1; vertexIndex--) {
		var key = vertexIndex.toString()
		if (alongIndexesMap.has(key)) {
			var alongIndexes = alongIndexesMap.get(key)
			for (var alongIndexIndex = alongIndexes.length - 1; alongIndexIndex > -1; alongIndexIndex--) {
				var alongIndex = alongIndexes[alongIndexIndex]
				if (alongIndex[0] != 0.0) {
					facet.splice(vertexIndex + 1, 0, meetings[alongIndex[1]].pointIndex)
				}
			}
		}
	}
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
			pointIndexes[pointIndexesIndex] = [get3DDistanceSquared(minimumPoint, points[pointIndex]), pointIndex]
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

function addSplitIndexes(id, splitHeights, workMesh) {
	if (splitHeights == null) {
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
	var facets = workMesh.facets
	var facetSplits = []
	var lineSet = new Set()
	var outerFacetSplits = []
	var points = workMesh.points
	for (var facetIndex of facetIndexSet) {
		var facet = facets[facetIndex]
		facetSplits.push({facet:facet})
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextIndex = facet[(vertexIndex + 1) % facet.length]
			if (!getIsAwayFromHeight(splitHeight, points[pointIndex][2], points[nextIndex][2])) {
				lineSet.add(getEdgeKey(pointIndex, nextIndex))
			}
		}
	}
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		if (!facetIndexSet.has(facetIndex)) {
			var facet = facets[facetIndex]
			if (facetSharesLine(facet, lineSet)) {
				outerFacetSplits.push({facet:facet})
			}
		}
	}
	addSplitIndexesBySplits(facetSplits, id, outerFacetSplits, splitHeight, workMesh)
}

function addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh) {
	if (getIsEmpty(splitHeights)) {
		return
	}
	var facetIndexSet = new Set()
	var facets = workMesh.facets
	var lineSet = new Set()
	var oldFacetsLength = facets.length
	var points = workMesh.points
	var splitHeightZero = splitHeights[0]
	for (var facetIndex = facetIndexStart; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		facetIndexSet.add(facetIndex)
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var pointIndex = facet[vertexIndex]
			var nextIndex = facet[(vertexIndex + 1) % facet.length]
			if (!getIsAwayFromHeight(splitHeightZero, points[pointIndex][2], points[nextIndex][2])) {
				lineSet.add(getEdgeKey(pointIndex, nextIndex))
			}
		}
	}
	for (var facetIndex = 0; facetIndex < facetIndexStart; facetIndex++) {
		if (facetSharesLine(facets[facetIndex], lineSet)) {
			facetIndexSet.add(facetIndex)
		}
	}
	addSplitIndexesByFacetSet(facetIndexSet, id, splitHeightZero, workMesh)
	for (var splitHeightIndex = 1; splitHeightIndex < splitHeights.length; splitHeightIndex++) {
		for (var facetIndex = oldFacetsLength; facetIndex < facets.length; facetIndex++) {
			facetIndexSet.add(facetIndex)
		}
		oldFacetsLength = facets.length
		addSplitIndexesByFacetSet(facetIndexSet, id, splitHeights[splitHeightIndex], workMesh)
	}
}

function addSplitIndexesBySplits(facetSplits, id, outerFacetSplits, splitHeight, workMesh) {
	var facets = workMesh.facets
	var points = workMesh.points
	var splits = []
	var xzPoints = getXZPointsByFacetSplits(facetSplits, points)
	if (xzPoints == null) {
		return
	}
	var meetings = getMeetingsByHeight(facetSplits, outerFacetSplits, splitHeight, workMesh, xzPoints)
	for (var facetSplit of facetSplits) {
		addFacetsByFacetSplit(workMesh.facets, facetSplit, meetings, xzPoints, points)
	}
	for (var outerFacetSplit of outerFacetSplits) {
		addMeetingsToFacet(outerFacetSplit.alongIndexesMap, outerFacetSplit.facet, meetings)
	}
	var pointIndexSet = new Set()
	for (var meeting of meetings) {
		pointIndexSet.add(meeting.pointIndex)
	}
	for (var outerFacetSplit of outerFacetSplits) {
		for (var pointIndex of outerFacetSplit.facet) {
			pointIndexSet.delete(pointIndex)
		}
	}
	for (var key of pointIndexSet.keys()) {
		splits.push(key)
	}
	if (splits.length > 0) {
		if (workMesh.splitIndexesMap == undefined) {
			workMesh.splitIndexesMap = new Map()
		}
		if (workMesh.splitIndexesMap.has(id)) {
			pushArray(workMesh.splitIndexesMap.get(id), splits)
		}
		else {
			workMesh.splitIndexesMap.set(id, splits)
		}
	}
}

function addToArrowsMap(arrowsMap, edges) {
	var arrow = {beginKey:edges[0], endKey:edges[1]}
	addElementToMapArray(arrow, arrow.beginKey, arrowsMap)
	arrow = {beginKey:edges[1], endKey:edges[0]}
	addElementToMapArray(arrow, arrow.beginKey, arrowsMap)
}

function addToPointToolMap(facetIntersections, inversePoints, outerZ, pointIndex, pointToolIndexMap, toolMeshPoints) {
	if (pointToolIndexMap.has(pointIndex)) {
		return
	}
	var toolPoint = toolMeshPoints[pointIndex].slice(0)
	toolPoint[2] += outerZ
	for (var facetIntersection of facetIntersections) {
		for (var workPointIndex of facetIntersection.facet) {
			if (get3DDistanceSquared(toolPoint, inversePoints[workPointIndex]) < gCloseSquared) {
				pointToolIndexMap.set(pointIndex, workPointIndex)
				return
			}
		}
	}
}

function alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, operator, strata, toolPolygon, workMesh) {
	var alongIndexesMap = facetIntersection.alongIndexesMap
	var facets = workMesh.facets
	var facetIndex = facetIntersection.facetIndex
	var points = workMesh.points
	var workPolygon = facetIntersection.workPolygon
	if (alongIndexesMap.size == 0) {
		var toolFacet = new Array(toolPolygon.length)
		for (var pointIndex = 0; pointIndex < toolPolygon.length; pointIndex++) {
			toolFacet[pointIndex] = getToolMeshIndex(pointIndex, facetIntersection, toolPolygon, workMesh)
		}
		if (getIsFacetInStrata(toolFacet, points, strata)) {
			if (facetIntersection.isToolReversed) {
				toolFacet.reverse()
			}
			if (operator == 'i') {
				facets[facetIndex] = toolFacet
			}
			else {
				facets[facetIndex] = getConnectedFacet([facets[facetIndex], toolFacet], points)
			}
		}
		return
	}
	if (facetIntersection.isVertical) {
		var workNormal = getNormalByPolygon(workPolygon)
		for (var alongIndexesEntry of alongIndexesMap) {
			var alongIndexesKeyStrings = alongIndexesEntry[0].split(' ')
			if (alongIndexesKeyStrings[0] == 't') {
				var alongIndexes = alongIndexesEntry[1]
				var toolIndex = parseInt(alongIndexesKeyStrings[1])
				var toolNormal = get2DSubtraction(toolPolygon[(toolIndex + 1) % toolPolygon.length], toolPolygon[toolIndex])
				var heightMultiplier = 1.0
				if (get2DDotProduct(workNormal, toolNormal) < 0.0) {
					heightMultiplier = -heightMultiplier
				}
				for (var heightIndex = 0; heightIndex < alongIndexes.length; heightIndex++) {
					alongIndexes[heightIndex].push(heightMultiplier * meetings[alongIndexes[heightIndex][1]].point[2])
				}
				alongIndexes.sort(compareFirstThirdElementAscending)
			}
		}
	}
	var extantPolygons = getExtantPolygons(alongIndexesMap, facetIntersection.isVertical, meetings, operator, toolPolygon, workPolygon)
	for (var extantPolygon of extantPolygons) {
		removeRepeats(extantPolygon)
		var pointIndexMap = new Map()
		for (var nodeStringIndex = 0; nodeStringIndex < extantPolygon.length; nodeStringIndex++) {
			var nodeKey = extantPolygon[nodeStringIndex]
			var nodeStrings = nodeKey.split(' ')
			var extantIndex = getExtantIndex(nodeStrings, facetIntersection, meetings, points, toolPolygon, workMesh)
			extantPolygon[nodeStringIndex] = extantIndex
			pointIndexMap.set(nodeKey, extantIndex)
		}
		if (facetIntersection.isToolReversed) {
			extantPolygon.reverse()
		}
	}
	if (extantPolygons.length == 0) {
		facets[facetIndex] = null
		return
	}
	if (!getIsAFacetInStrata(extantPolygons, points, strata)) {
		facets[facetIndex] = null
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

function facetSharesLine(facet, sharedLineSet) {
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		if (sharedLineSet.has(getEdgeKey(facet[vertexIndex], facet[(vertexIndex + 1) % facet.length]))) {
			return true
		}
	}
	return false
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
	var closestDistance = Number.MAX_VALUE
	var connection = {firstVertexIndex:null, otherVertexIndex:null, otherFacetIndex:null}
	var facetLengthMinus = facets.length - 1
	var firstFacet = facets[0]
	for (var firstVertexIndex = 0; firstVertexIndex < firstFacet.length; firstVertexIndex++) {
		var firstPoint = points[firstFacet[firstVertexIndex]]
		for (var polygonIndex = 0; polygonIndex < facetLengthMinus; polygonIndex++) {
			var otherFacetIndex = polygonIndex + 1
			var otherFacet = facets[otherFacetIndex]
			for (var otherVertexIndex = 0; otherVertexIndex < otherFacet.length; otherVertexIndex++) {
				var distance = get2DDistanceSquared(firstPoint, points[otherFacet[otherVertexIndex]])
				if (distance < closestDistance) {
					closestDistance = distance
					connection.firstVertexIndex = firstVertexIndex
					connection.otherVertexIndex = otherVertexIndex
					connection.otherFacetIndex = otherFacetIndex
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
		connection.otherVertexIndex = getClosestVertexIndex(otherFacet, identicalVertexIndexes, points[firstPointIndex], points)
	}
	return connection
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
	var mesh = getMeshByPolygons(polygons)
	return getPolygonByFacet(getConnectedFacet(mesh.facets, mesh.points), mesh.points)
}

function getCSVMeshString(date, id, mesh, project) {
	var meshStrings = ['solid']
	if (!getIsEmpty(date)) {
		meshStrings.push('date,' + date)
	}
	meshStrings.push('format,csv')
	meshStrings.push('name,' + id)
	if (!getIsEmpty(project)) {
		meshStrings.push('project,' + project)
	}
	meshStrings.push('points')
	var points = mesh.points
	for (var point of points) {
		meshStrings.push(point.toString())
	}
	meshStrings.push('endpoints')
	meshStrings.push('facets')
	for (var facet of mesh.facets) {
		meshStrings.push(facet.toString())
	}
	meshStrings.push('endfacets')
	meshStrings.push('endsolid')
	return meshStrings.join('\n')
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
		return null
	}
	if (edges[0] == edges[1]) {
		return null
	}
	return edges
}

function getExtantIndex(nodeStrings, facetIntersection, meetings, points, toolPolygon, workMesh) {
	var nodeIndex = parseInt(nodeStrings[1])
	if (nodeStrings[0] == 't') {
		return getToolMeshIndex(nodeIndex, facetIntersection, toolPolygon, workMesh)
	}
	if (nodeStrings[0] == 'w') {
		return facetIntersection.facet[nodeIndex]
	}
	var meeting = meetings[nodeIndex]
	if (meeting.pointIndex == null) {
		meeting.pointIndex = points.length
		points.push(meeting.point)
	}
	if (meeting.isToolNode) {
		facetIntersection.toolMeshIndexMap.set(meeting.toolVertexIndex, meeting.pointIndex)
	}
	return meeting.pointIndex
}

function getFacetAddToTriangleFacets(checkTriangle, facet, isClockwise, xyPoints, xyTriangleFacets) {
	var clearestShortenedFacet = null
	var clearestTriangleFacet = null
	var greatestArea = null
	var centerIndexIndexes = new Array(facet.length)
	for (var pointIndexIndex = 0; pointIndexIndex < facet.length; pointIndexIndex++) {
		var beginPoint = xyPoints[facet[(pointIndexIndex - 1 + facet.length) % facet.length]]
		var centerPoint = xyPoints[facet[pointIndexIndex]]
		var endPoint = xyPoints[facet[(pointIndexIndex + 1) % facet.length]]
		var centerBegin = get2DSubtraction(beginPoint, centerPoint)
		var centerBeginLength = get2DLength(centerBegin)
		var centerEnd = get2DSubtraction(endPoint, centerPoint)
		var centerEndLength = get2DLength(centerEnd)
		if (centerBeginLength > 0.0 && centerEndLength > 0.0) {
			divide2DByScalar(centerBegin, centerBeginLength)
			divide2DByScalar(centerEnd, centerEndLength)
			var directionProximity = null
			if (isClockwise) {
				directionProximity = getDirectionalProximity(centerEnd, centerBegin)
			}
			else {
				directionProximity = getDirectionalProximity(centerBegin, centerEnd)
			}
			centerIndexIndexes[pointIndexIndex] = [directionProximity, pointIndexIndex]
		}
		else {
			centerIndexIndexes[pointIndexIndex] = [-9.0, pointIndexIndex]
		}
	}
	centerIndexIndexes.sort(compareFirstElementDescending)
	for (var centerIndexIndex of centerIndexIndexes) {
		pointIndexIndex = centerIndexIndex[1]
		var beginIndex = facet[(pointIndexIndex - 1 + facet.length) % facet.length]
		var triangleFacet = [beginIndex, facet[pointIndexIndex], facet[(pointIndexIndex + 1) % facet.length]]
		var triangle = getPolygonByFacet(triangleFacet, xyPoints)
		var isTriangleClear = true
		if (checkTriangle) {
			isTriangleClear = isClockwise == getIsClockwise(triangle)
		}
		if (isTriangleClear) {
			if (checkTriangle) {
				isTriangleClear = !getIsTriangleTooThin(triangle)
			}
			if (isTriangleClear) {
				var pointIndexStart = pointIndexIndex + 2
				var pointIndexEnd = pointIndexStart + facet.length - 3
				for (var afterIndex = pointIndexStart; afterIndex < pointIndexEnd; afterIndex++) {
					var checkIndex = facet[afterIndex % facet.length]
					if (!xyPointIsCloseToPoints(xyPoints[checkIndex], triangle)) {
						if (getIsPointInsidePolygonOrClose(xyPoints[checkIndex], triangle)) {
							if (checkTriangle) {
								isTriangleClear = false
							}
							break
						}
					}
				}
			}
			if (isTriangleClear) {
				var shortenedFacet = facet.slice(0)
				shortenedFacet.splice(pointIndexIndex, 1)
				var polygonArea = getDoublePolygonArea(getPolygonByFacet(shortenedFacet, xyPoints))
				if (!isClockwise) {
					polygonArea = -polygonArea
				}
				if (polygonArea > gClose) {
					xyTriangleFacets.push(triangleFacet)
					return shortenedFacet
				}
				else {
					if (clearestShortenedFacet == null) {
						greatestArea = polygonArea
						clearestShortenedFacet = shortenedFacet
						clearestTriangleFacet = triangleFacet
					}
					else {
						if (polygonArea > greatestArea) {
							greatestArea = polygonArea
							clearestShortenedFacet = shortenedFacet
							clearestTriangleFacet = triangleFacet
						}
					}
				}
			}
		}
	}
	if (clearestShortenedFacet != null) {
		xyTriangleFacets.push(clearestTriangleFacet)
		return clearestShortenedFacet
	}
	return facet
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

function getFacetIntersections(strata, toolPolygon, workMesh) {
	var facetIntersections = []
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		var facet = workMesh.facets[facetIndex]
		if (getIsFacetInStrata(facet, workMesh.points, strata)) {
			var workPolygon = getPolygonByFacet(facet, workMesh.points)
			if (getIsPolygonIntersectingOrClose(toolPolygon, workPolygon)) {
				var crossProductLength = get3DLength(getCrossProductByPolygon(workPolygon))
				var facetIntersection = {
				facet:facet,
				facetIndex:facetIndex,
				isClockwise:true,
				isVertical:Math.abs(getDoublePolygonArea(workPolygon)) / crossProductLength < gClose,
				isToolReversed:false,
				toolMeshIndexMap:new Map(),
				workPolygon:workPolygon}
				if (!facetIntersection.isVertical) {
					facetIntersection.isClockwise = getIsClockwise(workPolygon)
				}
				facetIntersections.push(facetIntersection)
			}
		}
	}
	return facetIntersections
}

//deprecated
function getFacetIntersectionsCheckDirection(isBottomClockwise, isToolClockwise, strata, toolPolygon, workMesh) {
	facetIntersections = getFacetIntersections(strata, toolPolygon, workMesh)
	for (var facetIntersection of facetIntersections) {
		facetIntersection.isToolReversed = facetIntersection.isClockwise != isBottomClockwise
		if (facetIntersection.isToolReversed) {
			facetIntersection.facet = facetIntersection.facet.slice(0).reverse()
			facetIntersection.workPolygon = facetIntersection.workPolygon.slice(0).reverse()
		}
	}
	return facetIntersections
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
	if (facet == null) {
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
		return null
	}
	var points = mesh.points
	var xFacets = new Array(facets.length)
	var xNormal = [1.0, 0.0, 0.0]
	for (var facetIndex = 0; facetIndex < xFacets.length; facetIndex++) {
		var normal = getNormalByFacet(facets[facetIndex], points)
		var xCloseness = -2
		if (normal != null) {
			xCloseness = get3DDotProduct(normal, xNormal)
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
	var xIntersections = getXIntersectionsByMesh(mesh, yzPoint[0], yzPoint[1])
	var numberOfIntersectionsToLeft = getNumberOfIntersectionsToLeft(getPointInsidePolygon(xzPolygon)[0] + gClose, xIntersections)
	if (numberOfIntersectionsToLeft == 0) {
		return null
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

function getJoinedCoplanarMesh(mesh) {
	var facets = mesh.facets
	var facetsMap = new Map()
	var linkMap = new Map()
	var normals = new Array(facets.length)
	var points = mesh.points
	for (facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		var normal = getNormalByFacet(facet, points)
		if (normal != null) {
			normals[facetIndex] = normal
			for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var nextIndex = (vertexIndex + 1) % facet.length
				var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
				addElementToMapArray(facetIndex, edgeKey, facetsMap)
			}
		}
	}
	for (var facetIndexes of facetsMap.values()) {
		if (facetIndexes.length == 2) {
			var facetIndex0 = facetIndexes[0]
			var facetIndex1 = facetIndexes[1]
			if (get3DLengthSquared(get3DSubtraction(normals[facetIndex0], normals[facetIndex1])) < 0.0000001) {
				addToLinkMap(facetIndex0, facetIndex1, linkMap)
			}
		}
	}
	var collinearities = new Array(points.length).fill(0)
	var joinedMap = getJoinedMap(facets.length, linkMap)
	var joinedFacetArrays = new Array(joinedMap.size)
	var joinedFacetArraysLength = 0
	var connectedFacets = new Array(joinedMap.size)
	for (var joined of joinedMap.values()) {
		var coplanarFacets = new Array(joined.length)
		for (var facetIndexIndex = 0; facetIndexIndex < joined.length; facetIndexIndex++) {
			var coplanarFacet = facets[joined[facetIndexIndex]]
			coplanarFacets[facetIndexIndex] = coplanarFacet
		}
		var joinedFacets = getJoinedFacets(coplanarFacets)
		for (var joinedFacetIndex = 0; joinedFacetIndex < joinedFacets.length; joinedFacetIndex++) {
			var joinedFacet = joinedFacets[joinedFacetIndex]
			for (vertexIndex = 0; vertexIndex < joinedFacet.length; vertexIndex++) {
				var beginVertex = joinedFacet[(vertexIndex + joinedFacet.length - 1) % joinedFacet.length]
				var centerVertex = joinedFacet[vertexIndex]
				var endVertex = joinedFacet[(vertexIndex + 1) % joinedFacet.length]
				if (getIsXYZCollinear(points[beginVertex], points[centerVertex], points[endVertex])) {
					collinearities[centerVertex] += 1
				}
			}
		}

		joinedFacetArrays[joinedFacetArraysLength] = joinedFacets
		joinedFacetArraysLength += 1

	}
	for (var connectedFacetIndex = 0; connectedFacetIndex < joinedFacetArrays.length; connectedFacetIndex++) {
		var joinedFacets = joinedFacetArrays[connectedFacetIndex]
		for (var joinedFacetIndex = 0; joinedFacetIndex < joinedFacets.length; joinedFacetIndex++) {
			var joinedFacet = joinedFacets[joinedFacetIndex]
			for (vertexIndex = 0; vertexIndex < joinedFacet.length; vertexIndex++) {
				if (collinearities[joinedFacet[vertexIndex]] == 2) {
					joinedFacet[vertexIndex] = null
				}
			}
			joinedFacets[joinedFacetIndex] = joinedFacet.filter(notNullCheck)
		}
		connectedFacets[connectedFacetIndex] = getConnectedFacet(joinedFacets, points)
	}
	var pointIndexes = new Array(points.length).fill(false)
	for (var facet of connectedFacets) {
		for (var vertex of facet) {
			pointIndexes[vertex] = true
		}
	}
	var pointLength = 0
	for (var pointIndexIndex = 0; pointIndexIndex < pointIndexes.length; pointIndexIndex++) {
		if (pointIndexes[pointIndexIndex]) {
			pointIndexes[pointIndexIndex] = pointLength
			points[pointLength] = points[pointIndexIndex]
			pointLength += 1
		}
	}
	points.length = pointLength
	for (var facet of connectedFacets) {
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			facet[vertexIndex] = pointIndexes[facet[vertexIndex]]
		}
	}
	return {facets:connectedFacets, points:points}
}

function getMeetings(facetIntersections, toolPolygon, workMesh) {
	var arrowsMap = new Map()
	var facets = workMesh.facets
	var meetings = []
	var points = workMesh.points
	var rotatedPointMap = new Map()
	for (var facetIntersection of facetIntersections) {
		var facet = facetIntersection.facet
		var facetIndex = facetIntersection.facetIndex
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
			addElementToMapArray(arrow, getEdgeKey(pointBeginIndex, pointEndIndex), arrowsMap)
		}
	}
	for (var toolBeginIndex = 0; toolBeginIndex < toolPolygon.length; toolBeginIndex++) {
		var toolEndIndex = (toolBeginIndex + 1) % toolPolygon.length
		var toolBegin = toolPolygon[toolBeginIndex]
		var toolEnd = toolPolygon[toolEndIndex]
		var delta = get2DSubtraction(toolEnd, toolBegin)
		var deltaLength = get2DLength(delta)
		if (deltaLength != 0.0) {
			divide2DByScalar(delta, deltaLength)
			var reverseRotation = [delta[0], -delta[1]]
			var toolBeginRotated = get2DRotation(toolBegin, reverseRotation)
			var toolEndRotated = get2DRotation(toolEnd, reverseRotation)
			var y = toolBeginRotated[1]
			for (var rotatedPointKey of rotatedPointMap.keys()) {
				rotatedPointMap.set(rotatedPointKey, get2DRotation(points[rotatedPointKey], reverseRotation))
			}
			for (var arrowsKey of arrowsMap.keys()) {
				var arrowsKeyStrings = arrowsKey.split(' ')
				var workBeginIndex = parseInt(arrowsKeyStrings[0])
				var workEndIndex = parseInt(arrowsKeyStrings[1])
				var workBeginRotated = rotatedPointMap.get(workBeginIndex)
				var workEndRotated = rotatedPointMap.get(workEndIndex)
				var meeting = getMeeting(toolBeginRotated[0], toolEndRotated[0], y, workBeginRotated, workEndRotated)
				if (meeting != null) {
					if (meeting.isWorkNode) {
						if (meeting.workAlong < 0.5) {
							meeting.pointIndex = workBeginIndex
						}
						else {
							meeting.pointIndex = workEndIndex
						}
						meeting.point = points[meeting.pointIndex]
					}
					else {
						meeting.point = null
					}
					if (meeting.isToolNode) {
						if (meeting.toolAlong < 0.5) {
							meeting.toolVertexIndex = toolBeginIndex
						}
						else {
							meeting.toolVertexIndex = toolEndIndex
						}
						if (meeting.point == null) {
							meeting.point = toolPolygon[meeting.toolVertexIndex].slice(0)
							var z = points[workBeginIndex][2] * (1.0 - meeting.workAlong) + points[workEndIndex][2] * meeting.workAlong
							if (meeting.point.length == 2) {
								meeting.point.push(z)
							}
							else {
								meeting.point[2] = z
							}
						}
					}
					if (meeting.point == null) {
						meeting.point = points[workBeginIndex].slice(0)
						multiplyArrayByScalar(meeting.point, (1.0 - meeting.workAlong))
						addArray(meeting.point, getArrayMultiplicationByScalar(points[workEndIndex], meeting.workAlong))
					}
					for (var arrow of arrowsMap.get(arrowsKey)) {
						var alongIndexesMap = arrow.facetIntersection.alongIndexesMap
						var workAlong = meeting.workAlong
						if (arrow.workDirection == false) {
							workAlong = 1.0 - workAlong
						}
						addMeetingToMap(
							meeting.toolAlong,
							alongIndexesMap,
							meeting.isToolNode,
							't ',
							meetings.length,
							toolBeginIndex,
							toolPolygon.length)
						addMeetingToMap(
							workAlong,
							alongIndexesMap,
							meeting.isWorkNode,
							'w ',
							meetings.length,
							arrow.workVertexIndex,
							arrow.facetLength)
					}
					meetings.push(meeting)
				}
			}
		}
	}
	return meetings
}

function getMeetingsByHeight(facetSplits, outerFacetSplits, splitHeight, workMesh, xzPoints) {
	var arrowsMap = new Map()
	var meetingLineSet = new Set()
	var meetings = []
	var points = workMesh.points
	for (var facetSplit of facetSplits) {
		facetSplit.alongIndexesMap = new Map()
		facetSplit.toolAlongIndexes = []
		var facet = facetSplit.facet
		for (var workVertexIndex = 0; workVertexIndex < facet.length; workVertexIndex++) {
			var pointBeginIndex = facet[workVertexIndex]
			var pointEndIndex = facet[(workVertexIndex + 1) % facet.length]
			var lineKey = getEdgeKey(pointBeginIndex, pointEndIndex)
			var arrow = {
				facetLength:facet.length,
				facetSplit:facetSplit,
				workDirection:pointBeginIndex < pointEndIndex,
				workVertexIndex:workVertexIndex}
			addElementToMapArray(arrow, lineKey, arrowsMap)
			meetingLineSet.add(lineKey)
		}
	}
	for (var outerFacetSplit of outerFacetSplits) {
		outerFacetSplit.alongIndexesMap = new Map()
		outerFacetSplit.toolAlongIndexes = null
		var facet = outerFacetSplit.facet
		for (var workVertexIndex = 0; workVertexIndex < facet.length; workVertexIndex++) {
			var pointBeginIndex = facet[workVertexIndex]
			var pointEndIndex = facet[(workVertexIndex + 1) % facet.length]
			var lineKey = getEdgeKey(pointBeginIndex, pointEndIndex)
			if (meetingLineSet.has(lineKey)) {
				var arrow = {
					facetLength:facet.length,
					facetSplit:outerFacetSplit,
					workDirection:pointBeginIndex < pointEndIndex,
					workVertexIndex:workVertexIndex}
				addElementToMapArray(arrow, lineKey, arrowsMap)
			}
		}
	}
	for (var arrowsKey of arrowsMap.keys()) {
		var arrowsKeyStrings = arrowsKey.split(' ')
		var workBeginIndex = parseInt(arrowsKeyStrings[0])
		var workEndIndex = parseInt(arrowsKeyStrings[1])
		var workBegin = xzPoints[workBeginIndex]
		var workEnd = xzPoints[workEndIndex]
		var meeting = getMeetingByHeight(splitHeight, workBegin, workEnd)
		if (meeting != null) {
			if (meeting.isWorkNode) {
				if (meeting.workAlong < 0.5) {
					meeting.pointIndex = workBeginIndex
				}
				else {
					meeting.pointIndex = workEndIndex
				}
				meeting.xzPoint = xzPoints[meeting.pointIndex]
			}
			else {
				var point = getArrayMultiplicationByScalar(points[workBeginIndex], 1.0 - meeting.workAlong)
				addArray(point, getArrayMultiplicationByScalar(points[workEndIndex], meeting.workAlong))
				meeting.pointIndex = points.length
				points.push(point)
				meeting.xzPoint = xzPoints[workBeginIndex].slice(0)
				multiplyArrayByScalar(meeting.xzPoint, (1.0 - meeting.workAlong))
				addArray(meeting.xzPoint, getArrayMultiplicationByScalar(xzPoints[workEndIndex], meeting.workAlong))
			}
			for (var arrow of arrowsMap.get(arrowsKey)) {
				var alongIndexesMap = arrow.facetSplit.alongIndexesMap
				var workAlong = meeting.workAlong
				if (arrow.workDirection == false) {
					workAlong = 1.0 - workAlong
				}
				if (arrow.facetSplit.toolAlongIndexes != null) {
					arrow.facetSplit.toolAlongIndexes.push([meeting.toolAlong, meetings.length])
				}
				addMeetingToMap(
				workAlong, alongIndexesMap, meeting.isWorkNode, '', meetings.length, arrow.workVertexIndex, arrow.facetLength)
			}
			meetings.push(meeting)
		}
	}
	for (var facetSplit of facetSplits) {
		var toolAlongIndexes = facetSplit.toolAlongIndexes
		toolAlongIndexes.sort(compareFirstElementAscending)
		for (var index = toolAlongIndexes.length - 1; index > 0; index--) {
			if (meetings[toolAlongIndexes[index][1]].pointIndex == meetings[toolAlongIndexes[index - 1][1]].pointIndex) {
				toolAlongIndexes.splice(index, 1)
			}
		}
	}
	return meetings
}

function getMeshAnalysis(mesh) {
	if (mesh == null) {
		return null
	}
	if (mesh.facets.length == 0) {
		return null
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
	for (facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
		var facet = mesh.facets[facetIndex]
		if (facet.length > greatestFacetVertexes) {
			greatestFacetVertexes = facet.length
		}
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var vertex = facet[vertexIndex]
			var nextVertex = facet[nextIndex]
			if (points[vertex].toString() == points[nextVertex].toString()) {
				numberOfIdenticalPoints += 1
			}
			var edgeKey = getEdgeKey(vertex.toString(), nextVertex.toString())
			var arrow = vertex.toString() + ' ' + nextVertex.toString()
			addElementToMapArray(arrow, edgeKey, arrowsMap)
			addElementToMapArray(facetIndex, edgeKey, facetsMap)
		}
	}
	for (var facetIndexes of facetsMap.values()) {
		if (facetIndexes.length == 2) {
			addToLinkMap(facetIndexes[0], facetIndexes[1], linkMap)
		}
	}
	for (var arrows of arrowsMap.values()) {
		numberOfEdges += 1
		if (arrows.length == 1) {
			loneEdges.push(arrows[0])
		}
		else {
			if (arrows.length > 2) {
				var moreThanDoubleEdgeStrings = []
				moreThanDoubleEdgeStrings.push('arrows:' + arrows.toString())
				var arrowStrings = arrows[0].split(' ')
				var edgeKey = getEdgeKey(arrowStrings[0], arrowStrings[1])
				var facetIndexes = facetsMap.get(edgeKey)
				for (var facetIndex of facetIndexes) {
					var facet = mesh.facets[facetIndex]
					moreThanDoubleEdgeStrings.push('facet:' + facet.toString())
					for (var vertex of facet) {
						moreThanDoubleEdgeStrings.push('vertexes:' + points[vertex].toString())
					}
				}
				for (var arrow of arrows) {
					var arrowStrings = arrow.split(' ')
					moreThanDoubleEdgeStrings.push('points:' + points[parseInt(arrowStrings[0])].toString())
					moreThanDoubleEdgeStrings.push('points:' + points[parseInt(arrowStrings[1])].toString())
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
		if (getNormalByFacet(facet, points) == null) {
			tooThinFacetsStrings.push('facet:' + facet.toString() + ' polygon:' + getPolygonByFacet(facet, points).toString())
		}
	}
	var isFacetPointingOutside = null
	var numberOfIncorrectEdges = loneEdges.length + moreThanDoubleEdges.length + unidirectionalEdges.length
	if (numberOfIncorrectEdges == 0) {
		isFacetPointingOutside = getIsFacetPointingOutside(mesh)
	}
	if (isFacetPointingOutside == null) {
		isFacetPointingOutside = 'Meaningless because mesh is incorrect.'
	}
	var numberOfErrors = numberOfIncorrectEdges + tooThinFacetsStrings.length
	attributeMap.set('greatestFacetVertexes', greatestFacetVertexes.toString())
	attributeMap.set('isFacetPointingOutside', isFacetPointingOutside.toString())
	if (loneEdges.length > 0) {
		attributeMap.set('loneEdges', loneEdges.join(';'))
	}
	var meshBoundingBox = getMeshBoundingBox(mesh)
	attributeMap.set('boundingBox', meshBoundingBox[0].toString() + ' ' + meshBoundingBox[1].toString())
	attributeMap.set('numberOfEdges', numberOfEdges.toString())
	attributeMap.set('numberOfErrors', numberOfErrors.toString())
	attributeMap.set('numberOfFacets', mesh.facets.length.toString())
	attributeMap.set('numberOfIdenticalPoints', numberOfIdenticalPoints.toString())
	attributeMap.set('numberOfIncorrectEdges', numberOfIncorrectEdges.toString())
	attributeMap.set('numberOfShapes', getJoinedMap(mesh.facets.length, linkMap).size.toString())
	attributeMap.set('numberOfTooThinFacets', tooThinFacetsStrings.length.toString())
	if (moreThanDoubleEdges.length > 0) {
		attributeMap.set('moreThanDoubleEdges', moreThanDoubleEdges.join(';'))
	}
	if (unidirectionalEdges.length > 0) {
		attributeMap.set('unidirectionalEdges', unidirectionalEdges.join(';'))
	}
	if (tooThinFacetsStrings.length > 0) {
		attributeMap.set('tooThinFacets', tooThinFacetsStrings.join(';'))
	}
	return attributeMap
}

function getMeshBoundingBox(mesh) {
	var boundingBox = null
	var points = mesh.points
	for (var facet of mesh.facets) {
		for (var vertexIndex of facet) {
			var point = points[vertexIndex]
			if (!Number.isNaN(point[0])) {
				if (boundingBox == null) {
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
	return getJoinedCoplanarMesh(getMeshByTipMap(pointMap, tipMap))
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
	var facet = []
	var facets = []
	var isSolid = false
	var pointMap = new Map()
	var points = []
	var lines = stlInputString.split(getEndOfLine(stlInputString))
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
						if (words[1] == id) {
							isSolid = true
						}
					}
				}
			}
		}
	}
	return null
}

function getMeshCopy(mesh) {
	var meshCopy = {facets:getArraysCopy(mesh.facets), points:getArraysCopy(mesh.points)}
	if (mesh.splitIndexesMap != undefined) {
		meshCopy.splitIndexesMap = new Map(mesh.splitIndexesMap.entries())
	}
	return meshCopy
}

function getMeshString(date, filetype, id, mesh, project) {
	if (filetype.toLowerCase() == 'stl') {
		return getSTLMeshString(id, mesh)
	}
	if (filetype.toLowerCase() == 'csv') {
		return getCSVMeshString(date, id, mesh, project)
	}
	return null
}

function getNormalByFacet(facet, points) {
	return getNormalByPolygon(getPolygonByFacet(facet, points))
}

function getOutsidestVertexIndex(facet, identicalVertexIndexes, otherPoint, points) {
	var centerPoint = points[identicalVertexIndexes[0]]
	var outsidestVertexIndex = null
	var otherCenter = get2DSubtraction(otherPoint, centerPoint)
	var maximumDotProduct = -Number.MAX_VALUE
	for (var vertexIndex of identicalVertexIndexes) {
		var beginPoint = points[facet[(vertexIndex - 1 + facet.length) % facet.length]]
		var centerBegin = normalize2D(get2DSubtraction(beginPoint, centerPoint))
		var endPoint = points[facet[(vertexIndex + 1) % facet.length]]
		var centerEnd = normalize2D(get2DSubtraction(endPoint, centerPoint))
		var dotProduct = get2DDotProduct(otherCenter, centerBegin) + get2DDotProduct(otherCenter, centerEnd)
		if (dotProduct > maximumDotProduct) {
			maximumDotProduct = dotProduct
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

function getPointIndexesPrunePoints(points) {
	var pointIndexes = new Array(points.length)
	var pointLength = 0
	var pointStringIndexMap = new Map()
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var pointString = points[pointIndex].join(',')
		if (pointStringIndexMap.has(pointString)) {
			pointIndexes[pointIndex] = pointStringIndexMap.get(pointString)
		}
		else {
			pointStringIndexMap.set(pointString, pointLength)
			pointIndexes[pointIndex] = pointLength
			points[pointLength] = points[pointIndex]
			pointLength += 1
		}
	}
	points.length = pointLength
	return pointIndexes
}

/*deprecated
function getSharedArrows(facetIntersections, facets) {
	var sharedArrows = []
	var edgeIntersectionsSet = new Set()
	var facetIntersectionsSet = new Set()
	for (var facetIntersection of facetIntersections) {
		facetIntersectionsSet.add(facetIntersection.facetIndex)
	}
	for (var facetIndex of facetIntersectionsSet) {
		var facet = facets[facetIndex]
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			edgeIntersectionsSet.add(getEdgeKey(facet[vertexIndex], facet[(vertexIndex + 1) % facet.length]))
		}
	}
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		if (!facetIntersectionsSet.has(facetIndex)) {
			var facet = facets[facetIndex]
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				var pointIndex = facet[vertexIndex]
				var nextPointIndex = facet[(vertexIndex + 1) % facet.length]
				if (edgeIntersectionsSet.has(getEdgeKey(pointIndex.toString(), nextPointIndex.toString()))) {
					sharedArrows.push([pointIndex, nextPointIndex])
				}
			}
		}
	}
	return sharedArrows
}
*/
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
		var normalStrings = ['facet']
		if (normal != null) {
			normalStrings.push('normal')
			for (var parameter of normal) {
				normalStrings.push(parameter.toFixed(2))
			}
		}
		meshStrings.push(normalStrings.join(' '))
		meshStrings.push('  outer loop')
		for (var pointIndex of facet) {
			meshStrings.push('    vertex ' + points[pointIndex].toString().replace(/,/g, ' '))
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
				zFacets.push([points[pointIndex][2], pointIndex, facetIntersection.isToolReversed])
			}
		}
		zFacets.sort(compareFirstElementAscending)
		for (var zFacetIndex = 1; zFacetIndex < zFacets.length; zFacetIndex++) {
			var bottomZFacet = zFacets[zFacetIndex - 1]
			var topZFacet = zFacets[zFacetIndex]
			if (bottomZFacet[2] == false && topZFacet[2] == true) {
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
	var facetPolygon = getPolygonByFacet(workMesh.facets[facetIntersection.facetIndex], points)
	var z = getZByPointPolygon(toolPoint, facetPolygon)
	var pointsLength = points.length
	facetIntersection.toolMeshIndexMap.set(directedIndex, pointsLength)
	points.push([toolPoint[0], toolPoint[1], z])
	return pointsLength
}

function getTriangleMesh(mesh) {
	var facets = mesh.facets
	var points = mesh.points
	var triangleFacets = []
	var xyPoints = new Array(points.length)
	for (var facet of facets) {
		pushArray(triangleFacets, get3DTriangleFacets(facet, points, xyPoints))
	}
	return {facets:triangleFacets, points:mesh.points}
}

//deprecated
function getTriangleMeshString(date, filetype, id, mesh, project) {
	if (filetype.toLowerCase() == 'stl') {
		return getSTLMeshString(id, mesh)
	}
	if (filetype.toLowerCase() == 'csv') {
		return getCSVMeshString(date, id, getTriangleMesh(mesh), project)
	}
}

function getXIntersectionsByMesh(mesh, y, z) {
	var xIntersections = []
	var xyPolygons = getXYPolygonsByZ(mesh, z)
	for (var xyPolygon of xyPolygons) {
		addXIntersectionsByPolygon(xIntersections, xyPolygon, y)
	}
	return xIntersections
}

function getXYPolygonsByZ(mesh, z) {
	var facets = mesh.facets
	var arrowsMap = new Map()
	var points = mesh.points
	for (var facet of facets) {
		var zList = new Array(facet.length)
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			zList[vertexIndex] = points[facet[vertexIndex]][2]
		}
		var edges = getEdgesByFacet(facet, z, zList)
		if (edges != null) {
			addToArrowsMap(arrowsMap, edges)
		}
	}
	return getXYPolygonsByArrows(arrowsMap, points, z)
}

function getXYPolygonsMapByMesh(mesh) {
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
			if (edges != null) {
				var arrowsMap = null
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
		xyPolygonsMap.set(z, getXYPolygonsByArrows(entry[1], points, z))
	}
	return xyPolygonsMap
}

function getXYTriangleFacets(originalFacet, xyPoints) {
	var facetLengthMinusTwo = originalFacet.length - 2
	var facetLengthMinusThree = originalFacet.length - 3
	var isClockwise = getIsClockwise(getPolygonByFacet(originalFacet, xyPoints))
	facet = originalFacet.slice(0)
	xyTriangleFacets = []
	for (var triangleIndex = 0; triangleIndex < facetLengthMinusThree; triangleIndex++) {
		facet = getFacetAddToTriangleFacets(true, facet, isClockwise, xyPoints, xyTriangleFacets)
	}
	if (facet.length > 3) {
		var warningString = 'In getXYTriangleFacets facet.length > 3:'
		var originalPolygonString = getFloatListsString(getPolygonByFacet(originalFacet, xyPoints))
		warningByList([warningString, originalPolygonString, getFloatListsString(getPolygonByFacet(facet, xyPoints))])
		var extraShortening = facet.length - 3
		for (var triangleIndex = 0; triangleIndex < extraShortening; triangleIndex++) {
			facet = getFacetAddToTriangleFacets(false, facet, isClockwise, xyPoints, xyTriangleFacets)
		}
	}
	xyTriangleFacets.push(facet)
	return xyTriangleFacets
}

function get3DTriangleFacets(facet, points, xyPoints) {
	if (facet.length < 4) {
		return [facet]
	}
	var normal = getNormalByFacet(facet, points)
	if (normal == null) {
		return []
	}
	var plane = getPlaneByNormal(normal)
	for (var pointIndex of facet) {
		xyPoints[pointIndex] = [get3DDotProduct(points[pointIndex], plane[0]), get3DDotProduct(points[pointIndex], plane[1])]
	}
	return getXYTriangleFacets(facet, xyPoints)
}

function getXZPointsByFacetSplits(facetSplits, points) {
	var proximityNormals = []
	var xzPoints = new Array(points.length)
	for (var facetSplit of facetSplits) {
		var normal = getNormalByFacet(facetSplit.facet, points)
		if (normal != null) {
			if (normal[1] < 0) {
				proximityNormals.push([normal[0], -normal[0], -normal[1]])
			}
			else {
				proximityNormals.push([normal[0], normal[0], normal[1]])
			}
		}
	}
	if (proximityNormals.length == 0) {
		return null
	}
	proximityNormals.sort(compareFirstElementAscending)
	for (var proximityNormal of proximityNormals) {
		proximityNormal[0] = proximityNormal[1]
		proximityNormal[1] = proximityNormal[2]
	}
	var proximityNormalZero = proximityNormals[0]
	proximityNormals.push([-proximityNormalZero[0], -proximityNormalZero[1]])
	var smallestDotProduct = get2DDotProduct(proximityNormalZero, proximityNormals[1])
	var largestGapIndex = 0
	for (var proximityIndex = 1; proximityIndex < proximityNormals.length - 1; proximityIndex++) {
		var dotProduct = get2DDotProduct(proximityNormals[proximityIndex], proximityNormals[proximityIndex + 1])
		if (dotProduct < smallestDotProduct) {
			smallestDotProduct = dotProduct
			largestGapIndex = proximityIndex
		}
	}
	var normalizedBisector = getNormalizedBisector(proximityNormals[largestGapIndex], proximityNormals[largestGapIndex + 1])
	normalizedBisector[1] = -normalizedBisector[1]
	var minimumX = Number.MAX_VALUE
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var x = point[0] * normalizedBisector[0] - point[1] * normalizedBisector[1]
		xzPoints[pointIndex] = [x, point[2]]
		minimumX = Math.min(minimumX, x)
	}
	var addition = 2 - minimumX
	for (var xzPoint of xzPoints) {
		if (xzPoint != undefined) {
			xzPoint[0] += addition
		}
	}
	return xzPoints
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
	var indexMap = new Map()
	var pointCount = 0
	var points = mesh.points
	removeNulls(facets)
	for (var facet of facets) {
		for (var pointIndex of facet) {
			indexMap.set(pointIndex, null)
		}
	}
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		if (indexMap.has(pointIndex)) {
			indexMap.set(pointIndex, pointCount)
			pointCount += 1
		}
		else {
			points[pointIndex] = null
		}
	}
	for (var facet of facets) {
		for (var pointIndexIndex = 0; pointIndexIndex < facet.length; pointIndexIndex++) {
			facet[pointIndexIndex] = indexMap.get(facet[pointIndexIndex])
		}
	}
	removeNulls(points)
}

function removeUnpairedFacet(isBottomClockwise, facetIntersectionIndex, facetIntersections) {
	var facetIntersection = facetIntersections[facetIntersectionIndex]
	if (facetIntersection.isVertical) {
		return
	}
	var isWorkClockwise = facetIntersection.isClockwise
	var pointInsidePolygon = getPointInsidePolygon(facetIntersection.workPolygon)
	var pointZ = getZByPointPolygon(pointInsidePolygon, facetIntersection.workPolygon)
	for (var checkIndex = 0; checkIndex < facetIntersections.length; checkIndex++) {
		var checkIntersection = facetIntersections[checkIndex]
		if (checkIndex != facetIntersectionIndex && !checkIntersection.isVertical) {
			var checkPolygon = checkIntersection.workPolygon
			if (checkIntersection.isClockwise != isWorkClockwise) {
				if (getIsPointInsidePolygonOrClose(pointInsidePolygon, checkPolygon)) {
					var checkZ = getZByPointPolygon(pointInsidePolygon, checkPolygon)
					if (checkIntersection.isClockwise == isBottomClockwise) {
						if (checkZ <= pointZ) {
							return
						}
					}
					else {
						if (checkZ >= pointZ) {
							return
						}
					}
				}
			}
		}
	}
	return facetIntersections.splice(facetIntersectionIndex, 1)
}

function sortRemoveMeetingsByFacetIntersections(facetIntersections, meetings) {
	for (var facetIntersection of facetIntersections.values()) {
		sortRemoveMeetings(facetIntersection.alongIndexesMap, meetings)
	}
}
