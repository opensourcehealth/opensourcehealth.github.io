//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetByWorkMap(facets, key, nextIndex, workMap) {
	var facet = []
	var startKey = key
	for (var whileIndex = 0; whileIndex < gLengthLimit; whileIndex++) {
		facet.push(key)
		if (nextIndex == null || nextIndex == startKey) {
			if (facet.length > 2) {
				facets.push(facet)
			}
			return
		}
		key = nextIndex
		nextIndex = null
		if (workMap.has(key)) {
			nextIndex = workMap.get(key)
			workMap.set(key, null)
		}
	}
}

function addFacetsByWorkMap(facets, workMap) {
	for (var key of workMap.keys()) {
		var nextIndex = workMap.get(key)
		if (nextIndex != null) {
			workMap.set(key, null)
			addFacetByWorkMap(facets, key, nextIndex, workMap)
		}
	}
}

function addIntersectionsToMesh(facets, id, originalLoneArrowSet, workMesh) {
	var loneArrowSet = getLoneArrowSet(facets)
	removeCollectionElementsByIterable(loneArrowSet, originalLoneArrowSet)
	var pointSet = new Set()
	for (var arrow of loneArrowSet) {
		pointSet.add(arrow.split(' ')[0])
	}
	if (pointSet.size > 0) {
		if (workMesh.intersectionIndexesMap == undefined) {
			workMesh.intersectionIndexesMap = new Map()
		}
		addElementsToMapArray(Array.from(pointSet), id, workMesh.intersectionIndexesMap)
	}
}

function addMeshesRecursively(depth, meshes, registry, statement) {
	if (depth > gRecursionLimit) {
		var warningText = 'Recursion limit of 1,000 in addMeshesRecursively reached, no further statements will be added.'
		warningByList([warningText, statement, gRecursionLimit])
		return
	}
	var mesh = getWorkMeshByID(statement.attributeMap.get('id'), registry)
	if (mesh != null) {
		meshes.push(mesh)
	}
	depth += 1
	for (var child of statement.children) {
		addMeshesRecursively(depth, meshes, registry, child)
	}
	return meshes
}

function addVerticalFacets(facetIntersections, isClockwiseTop, toolPolygon, workMesh) {
	var facets = workMesh.facets
	var workFacets = []
	addFacetsByWorkMap(workFacets, getDifferenceWorkMap(facets))
	var polylines = []
	var toolPairMap = getToolPairMap(facetIntersections, isClockwiseTop, workMesh.points, toolPolygon)
	for (var workFacet of workFacets) {
		var startIndex = null
		for (var vertexIndex = 0; vertexIndex < workFacet.length; vertexIndex++) {
			if (toolPairMap.has(workFacet[vertexIndex])) {
				startIndex = vertexIndex
				break
			}
		}
		if (startIndex == null) {
			facets.push(workFacet)
		}
		else {
			var polyline = null
			for (var extraIndex = 0; extraIndex < workFacet.length; extraIndex++) {
				var vertexIndex = (startIndex + extraIndex) % workFacet.length
				var beginIndex = workFacet[vertexIndex]
				var nextIndex = workFacet[(vertexIndex + 1) % workFacet.length]
				if (polyline == null) {
					polyline = [beginIndex, nextIndex]
				}
				else {
					if (toolPairMap.has(workFacet[vertexIndex])) {
						polylines.push(polyline)
						polyline = [beginIndex, nextIndex]
					}
					else {
						polyline.push(nextIndex)
					}
				}
			}
			if (!getIsEmpty(polyline)) {
				polylines.push(polyline)
			}
		}
	}
	var endKeyMap = new Map()
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		endKeyMap.set(polylines[polylineIndex][0], polylineIndex)
	}
	for (var polylineIndex = 0; polylineIndex < polylines.length; polylineIndex++) {
		var polyline = polylines[polylineIndex]
		var beginKey = polyline[polyline.length - 1]
		var endPolylineIndex = null
		if (toolPairMap.has(beginKey)) {
			var pairKey = toolPairMap.get(beginKey)
			if (endKeyMap.has(pairKey)) {
				endPolylineIndex = endKeyMap.get(pairKey)
			}
		}
		if (endPolylineIndex != null) {
			polylines[polylineIndex] = null
			if (endPolylineIndex == polylineIndex) {
				if (polyline[0] == polyline[polyline.length - 1]) {
					polyline.pop()
				}
				if (polyline.length > 2) {
					facets.push(polyline)
				}
				endKeyMap.delete(polyline[0])
			}
			else {
				pushArray(polyline, polylines[endPolylineIndex])
				polylines[endPolylineIndex] = polyline
				endKeyMap.set(polyline[0], endPolylineIndex)
			}
		}
	}
	for (var polyline of polylines) {
		if (polyline != null) {
			noticeByList(['polyline is not null in addVerticalFacets in construction.', polyline, polylines])
			if (polyline[0] == polyline[polyline.length - 1]) {
				polyline.pop()
			}
			if (polyline.length > 2) {
				facets.push(polyline)
			}
		}
	}
}

function differenceByPillar(id, matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				differenceByPolygon(id, splitHeights, splitInsides, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function differenceByPolygon(id, splitHeights, splitInsides, strata, toolPolygon, workMesh) {
	if (toolPolygon.length < 3) {
		return
	}
	var facets = workMesh.facets
	addFacetsByWorkMap(facets, getDifferenceWorkMap(facets))
	var toolDirected = getDirectedPolygon(false, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	directFacetIntersections(facetIntersections, true)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	var originalLoneArrowSet = getLoneArrowSet(facets)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gDifferenceExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	addIntersectionsToMesh(facets, id, originalLoneArrowSet, workMesh)
	var facetIndexStart = facets.length
	addVerticalFacets(facetIntersections, true, toolPolygon, workMesh)
	if (!getIsEmpty(splitInsides)) {
		var toolFacets = facets.slice(facetIndexStart, facets.length)
		splitHeights = getSplitHeightsByInsides(toolFacets, splitHeights, splitInsides, workMesh)
	}
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	removeShortArrays(facets, 3)
}

function embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh) {
	var outset = gClose
	if (isTop) {
		outset = -outset
	}
	var toolMeshFacets = getArraysCopy(toolMesh.facets)
	var toolMeshPoints = getArraysCopy(toolMesh.points)
	var xyFacet = null
	var xyFacetIndex = 0
	var toolDirected = null
	for (; xyFacetIndex < toolMeshFacets.length; xyFacetIndex++) {
		xyFacet = toolMeshFacets[xyFacetIndex]
		var polygon = getPolygonByFacet(xyFacet, toolMeshPoints)
		var isZZero = true
		for (var point of polygon) {
			if (point[2] != 0.0) {
				isZZero = false
				break
			}
		}
		if (isZZero) {
			toolDirected = polygon
			break
		}
	}
	if (toolDirected == null) {
		xyFacetIndex = 0
		xyFacet = toolMeshFacets[0]
		toolDirected = getPolygonByFacet(xyFacet, toolMeshPoints)
	}
	if (getIsClockwise(toolDirected) != isTop) {
		reverseArrays(toolMeshFacets)
		toolDirected.reverse()
	}
	var insetToolDirected = getOutsetPolygonByMarker(null, null, true, [[outset, outset]], toolDirected, null)
	for (var strata of stratas) {
		embossMeshByStrata(
		insetToolDirected, inversePoints, isTop, strata, toolDirected, toolMeshFacets, toolMeshPoints, xyFacet, xyFacetIndex, workMesh)
	}
}

function embossMeshByStrata(
insetToolDirected, inversePoints, isTop, strata, toolDirected, toolMeshFacets, toolMeshPoints, xyFacet, xyFacetIndex, workMesh) {
	var allFacetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var closeFacetIntersections = []
	var facetIntersections = []
	for (var facetIntersection of allFacetIntersections) {
		if (facetIntersection.isClockwise != isTop || facetIntersection.isVertical) {
			var isIntersection = !facetIntersection.isVertical
			if (isIntersection) {
				isIntersection = getIsPolygonIntersecting(insetToolDirected, facetIntersection.workPolygon)
			}
			if (isIntersection) {
				facetIntersections.push(facetIntersection)
			}
			else {
				closeFacetIntersections.push(facetIntersection)
			}
		}
	}
	var facetIntersectionsMap = new Map()
	var linkMap = new Map()
	for (var facetIntersectionIndex = 0; facetIntersectionIndex < facetIntersections.length; facetIntersectionIndex++) {
		var facet = facetIntersections[facetIntersectionIndex].facet
		for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var vertex = facet[vertexIndex]
			var nextVertex = facet[(vertexIndex + 1) % facet.length]
			addElementToMapArray(facetIntersectionIndex, getEdgeKey(vertex.toString(), nextVertex.toString()), facetIntersectionsMap)
		}
	}
	addFirstTwoKeysToLinkMap(facetIntersectionsMap, linkMap)
	var joinedMap = getJoinedMap(facetIntersections.length, linkMap)
	for (var joined of joinedMap.values()) {
		var arrowSet = new Set()
		var joinedFacetIntersections = new Array(joined.length)
		for (var joinedIndex = 0; joinedIndex < joined.length; joinedIndex++) {
			var facetIntersection = facetIntersections[joined[joinedIndex]]
			joinedFacetIntersections[joinedIndex] = facetIntersection
			var facet = facetIntersection.facet
			for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
				arrowSet.add(facet[(vertexIndex + 1) % facet.length] + ' ' + facet[vertexIndex])
			}
		}
		var joinedCloseIntersections = []
		for (var closeFacetIntersection of closeFacetIntersections) {
			if (facetSharesArrow(closeFacetIntersection.facet, arrowSet)) {
				joinedCloseIntersections.push(closeFacetIntersection)
			}
		}
		embossMeshByIntersections(joinedCloseIntersections, joinedFacetIntersections,
		inversePoints, strata, toolDirected, getArraysCopy(toolMeshFacets), getArraysCopy(toolMeshPoints),
		xyFacet.slice(0), xyFacetIndex, workMesh)
	}
}

function embossMeshByIntersections(closeFacetIntersections, facetIntersections,
inversePoints, strata, toolDirected, toolMeshFacets, toolMeshPoints, xyFacet, xyFacetIndex, workMesh) {
	addFacetsByWorkMap(workMesh.facets, getDifferenceWorkMap(workMesh.facets))
	allFacetIntersections = facetIntersections.concat(closeFacetIntersections)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	var arrowAlongMap = new Map()
	for (var facetIntersection of facetIntersections) {
		var alongIndexesMap = facetIntersection.alongIndexesMap
		for (var nodeKey of alongIndexesMap.keys()) {
			var nodeStrings = nodeKey.split(' ')
			if (nodeStrings[0] == 'w') {
				var facet = workMesh.facets[facetIntersection.facetIndex]
				var beginIndex = parseInt(nodeStrings[1])
				var endIndex = (beginIndex + 1) % facet.length
				arrowAlongMap.set(facet[endIndex].toString() + ' ' + facet[beginIndex], alongIndexesMap.get(nodeKey))
			}
		}
	}
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gDifferenceExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	for (var closeFacetIntersection of closeFacetIntersections) {
		addMeetingsToFacet(arrowAlongMap, workMesh.facets[closeFacetIntersection.facetIndex], meetingMap)
	}
	var borderSet = new Set()
	var xySet = new Set(xyFacet)
	for (var toolFacetIndex = 0; toolFacetIndex < toolMeshFacets.length; toolFacetIndex++) {
		if (toolFacetIndex != xyFacetIndex) {
			var toolFacet = toolMeshFacets[toolFacetIndex]
			for (var pointIndexIndex = 0; pointIndexIndex < toolFacet.length; pointIndexIndex++) {
				var pointIndex = toolFacet[pointIndexIndex]
				if (!xySet.has(pointIndex)) {
					if (xySet.has(toolFacet[(pointIndexIndex - 1 + toolFacet.length) % toolFacet.length])) {
						borderSet.add(pointIndex)
					}
					else {
						if (xySet.has(toolFacet[(pointIndexIndex + 1) % toolFacet.length])) {
							borderSet.add(pointIndex)
						}
					}
				}
			}
		}
	}
	var averageBorderHeight = 0.0
	for (var pointIndex of borderSet) {
		averageBorderHeight += toolMeshPoints[pointIndex][2]
	}
	var isConnectionAboveXY = averageBorderHeight > 0.0
	var outerZ = null
	var pointToolIndexMap = new Map()
	for (var toolPointIndex = 0; toolPointIndex < toolDirected.length; toolPointIndex++) {
		for (var facetIntersection of facetIntersections) {
			if (facetIntersection.toolMeshIndexMap.has(toolPointIndex)) {
				var inversePointIndex = facetIntersection.toolMeshIndexMap.get(toolPointIndex)
				var inversePointZ = inversePoints[inversePointIndex][2]
				if (outerZ == null) {
					outerZ = inversePointZ
				}
				else {
					if (isConnectionAboveXY) {
						outerZ = Math.max(outerZ, inversePointZ)
					}
					else {
						outerZ = Math.min(outerZ, inversePointZ)
					}
				}
				pointToolIndexMap.set(xyFacet[toolPointIndex], inversePointIndex)
				break
			}
		}
	}
	for (var pointIndex of xyFacet) {
		addToPointToolMap(facetIntersections, inversePoints, outerZ, pointIndex, pointToolIndexMap, toolMeshPoints)
	}
	for (var toolFacet of toolMeshFacets) {
		for (var pointIndexIndex = 0; pointIndexIndex < toolFacet.length; pointIndexIndex++) {
			var pointIndex = toolFacet[pointIndexIndex]
			if (!pointToolIndexMap.has(pointIndex)) {
				pointToolIndexMap.set(pointIndex, inversePoints.length)
				var toolMeshPoint = toolMeshPoints[pointIndex]
				toolMeshPoint[2] += outerZ
				inversePoints.push(toolMeshPoint)
			}
			toolFacet[pointIndexIndex] = pointToolIndexMap.get(pointIndex)
		}
	}
	var workMap = getDifferenceWorkMap(workMesh.facets)
	for (var toolFacetIndex = 0; toolFacetIndex < toolMeshFacets.length; toolFacetIndex++) {
		var toolFacet = toolMeshFacets[toolFacetIndex]
		if (toolFacetIndex != xyFacetIndex) {
			workMesh.facets.push(getFacetByWorkMap(toolFacet, workMap))
		}
	}
	removeShortArrays(workMesh.facets, 3)
}
function embossMeshesByTransform2Ds(matrix2Ds, matrix3D, isTop, stratas, toolMeshes, workMesh) {
	if (getIsEmpty(toolMeshes)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	for (var toolMesh of toolMeshes) {
		if (getIsEmpty(matrix2Ds)) {
			embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
		}
		else {
			var toolMeshPoints = getArraysCopy(toolMesh.points)
			for (var matrix2D of matrix2Ds) {
				overwriteArraysUntil(toolMesh.points, toolMeshPoints, 2)
				transform2DPoints(matrix2D, toolMesh.points)
				embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
			}
			overwriteArraysUntil(toolMesh.points, toolMeshPoints, 2)
		}
	}
	pushArray(originalPoints, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	workMesh.points = originalPoints
	removeUnfacetedPoints(workMesh)
}

function getAssembledMesh(centerScale, meshes) {
	if (meshes.length == 0) {
		return {facets:[], points:[]}
	}
	var assembledMesh = getMeshCopy(meshes[0])
	if (!getIsEmpty(centerScale)) {
		if (centerScale.length < 2) {
			centerScale.push(centerScale[0])
		}
		if (centerScale.length < 3) {
			centerScale.push(centerScale[1])
		}
	}
	for (var meshIndex = 1; meshIndex < meshes.length; meshIndex++) {
		var pointLength = assembledMesh.points.length
		var meshCopy = getMeshCopy(meshes[meshIndex])
		if (!getIsEmpty(centerScale)) {
			var meshBoundingBox = getMeshBoundingBox(meshCopy)
			var center = multiply3DScalar(getAddition3D(meshBoundingBox[0], meshBoundingBox[1]), 0.5)
			add3Ds(meshCopy.points, getMultiplication3DScalar(center, -1.0))
			multiply3Ds(meshCopy.points, centerScale)
			add3Ds(meshCopy.points, center)
		}
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
				addMapToMapArray(meshCopy.intersectionIndexesMap, assembledMesh.intersectionIndexesMap)
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
				addMapToMapArray(meshCopy.splitIndexesMap, assembledMesh.intersectionIndexesMap)
			}
		}
	}
	return assembledMesh
}

function getDifferenceWorkMap(facets) {
	return getWorkMapByArrowSet(getLoneArrowSet(facets))
}

function getFacetIntersections(strata, toolPolygon, workMesh) {
	var facetIntersections = []
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		var facet = workMesh.facets[facetIndex]
		if (getIsFacetInStrata(facet, workMesh.points, strata)) {
			var workPolygon = getPolygonByFacet(facet, workMesh.points)
			if (getIsPolygonIntersectingOrClose(toolPolygon, workPolygon)) {
				var facetIntersection = {
				facet:facet,
				facetIndex:facetIndex,
				isClockwise:true,
				isVertical:Math.abs(getNormalByPolygon(workPolygon)[2]) < gClose,
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

function getMeshesByChildren(children, registry) {
	var meshes = []
	for (var child of children) {
		var mesh = getWorkMeshByID(child.attributeMap.get('id'), registry)
		if (mesh != null) {
			meshes.push(mesh)
		}
	}
	return meshes
}

function getMeshesByKey(key, registry, statement) {
	var ids = getStrings(key, statement)
	var meshes = []
	for (var id of ids) {
		if (registry.idMap.has(id)) {
			addMeshesRecursively(0, meshes, registry, registry.idMap.get(id))
		}
	}
	return meshes
}

function getOverlappedPolygons(outset, polygons) {
	if (polygons.length < 2) {
		return polygons
	}
	var overlappedPolygons = [polygons[0]]
	var outsetPolygons = [getOutsetPolygon(outset, polygons[0])]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		pushArray(overlappedPolygons, getDifferencePolygonsByPolygons(outsetPolygons, [polygons[polygonIndex]]))
		outsetPolygons.push(getOutsetPolygon(outset, polygons[polygonIndex]))
	}
	return overlappedPolygons
}

function getSplitHeightsByInsides(facets, splitHeights, splitInsides, workMesh) {
	var bottom = null
	var top = null
	for (var facet of facets) {
		for (var pointIndex of facet) {
			var pointZ = workMesh.points[pointIndex][2]
			if (bottom == null) {
				bottom = pointZ
				top = pointZ
			}
			else {
				bottom = Math.min(bottom, pointZ)
				top = Math.max(top, pointZ)
			}
		}
	}
	if (bottom == null) {
		return splitHeights
	}
	for (var splitInside of splitInsides) {
		var bottomPlus = bottom + splitInside
		var topMinus = top - splitInside
		if (Math.abs(bottomPlus - topMinus) < gClose) {
			splitHeights = getPushArray(splitHeights, [bottomPlus])
		}
		else {
			splitHeights = getPushArray(splitHeights, [bottomPlus, topMinus])
		}
	}
	return splitHeights
}

function getStratas(registry, statement) {
	var stratas = getFloatListsByStatement('stratas', registry, statement)
	if (getIsEmpty(stratas)) {
		return [null]
	}
	return stratas
}

function getToolPairMap(facetIntersections, isClockwiseTop, points, toolPolygon, topGreaterThan) {
	var bottomMap = new Map()
	var toolPairMap = new Map()
	var topMap = new Map()
	for (var toolVertexIndex = 0; toolVertexIndex < toolPolygon.length; toolVertexIndex++) {
		for (var facetIntersection of facetIntersections) {
			if (!facetIntersection.isVertical) {
				if (facetIntersection.toolMeshIndexMap.has(toolVertexIndex)) {
					var pointIndex = facetIntersection.toolMeshIndexMap.get(toolVertexIndex)
					var zIndex = [points[pointIndex][2], pointIndex]
					if (facetIntersection.isClockwise == isClockwiseTop) {
						addElementToMapArray(zIndex, toolVertexIndex, bottomMap)
					}
					else {
						addElementToMapArray(zIndex, toolVertexIndex, topMap)
					}
				}
			}
		}
	}
	for (var toolVertexIndex = 0; toolVertexIndex < toolPolygon.length; toolVertexIndex++) {
		if (bottomMap.has(toolVertexIndex) && topMap.has(toolVertexIndex)) {
			var bottomZIndexes = bottomMap.get(toolVertexIndex)
			var topZIndexes = topMap.get(toolVertexIndex)
			bottomZIndexes.sort(compareFirstElementAscending)
			topZIndexes.sort(compareFirstElementAscending)
			for (var bottomZIndex of bottomZIndexes) {
				for (var topZIndexIndex = 0; topZIndexIndex < topZIndexes.length; topZIndexIndex++) {
					var topZIndex = topZIndexes[topZIndexIndex]
					if (topZIndex != null) {
						if (topZIndex[0] > bottomZIndex[0]) {
							toolPairMap.set(bottomZIndex[1], topZIndex[1])
							toolPairMap.set(topZIndex[1], bottomZIndex[1])
							topZIndexes[topZIndexIndex] = null
							break
						}
					}
				}
			}
		}
	}
	return toolPairMap
}

function getWorkMapByArrowSet(arrowSet) {
	var workMap = new Map()
	for (var arrow of arrowSet) {
		var splitKey = arrow.split(' ')
		workMap.set(parseInt(splitKey[1]), parseInt(splitKey[0]))
	}
	return workMap
}

function getWorkPolygons(registry, statement) {
	var workStatement = getWorkStatement(registry, statement)
	if (workStatement == null) {
		return []
	}
	var workPolygons = getPolygonsHDRecursively(registry, workStatement)
	removeShortArrays(workPolygons, 3)
	return workPolygons
}

function intersectionByPillar(id, matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh) {
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	var intersectionFacets = []
	var originalFacets = getArraysCopy(workMesh.facets)
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				intersectionByPolygon(
				id, intersectionFacets, originalFacets, splitHeights, splitInsides, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.facets = intersectionFacets
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function intersectionByPolygon(id, intersectionFacets, originalFacets, splitHeights, splitInsides, strata, toolPolygon, workMesh) {
	if (toolPolygon.length < 3) {
		return
	}
	workMesh.facets = getArraysCopy(originalFacets)
	addFacetsByWorkMap(workMesh.facets, getDifferenceWorkMap(workMesh.facets))
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	directFacetIntersections(facetIntersections, true)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gIntersectionExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	var facetIndexSet = new Set()
	for (var facetIntersection of facetIntersections) {
		facetIndexSet.add(facetIntersection.facetIndex)
	}
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		if (!facetIndexSet.has(facetIndex)) {
			workMesh.facets[facetIndex] = []
		}
	}
	var facetIndexStart = workMesh.facets.length
	addVerticalFacets(facetIntersections, true, toolPolygon, workMesh)
	if (!getIsEmpty(splitInsides)) {
		var toolFacets = workMesh.facets.slice(facetIndexStart, workMesh.facets.length)
		splitHeights = getSplitHeightsByInsides(toolFacets, splitHeights, splitInsides, workMesh)
	}
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	for (var facet of workMesh.facets) {
		if (getIsLong(facet, 3)) {
			intersectionFacets.push(facet)
		}
	}
	removeShortArrays(workMesh.facets, 3)
}

function unionByPillar(id, matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix3D), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				unionByPolygon(id, splitHeights, splitInsides, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function unionByPolygon(id, splitHeights, splitInsides, strata, toolPolygon, workMesh) {
	if (toolPolygon.length < 3) {
		return
	}
	var facets = workMesh.facets
	addFacetsByWorkMap(facets, getDifferenceWorkMap(facets))
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	directFacetIntersections(facetIntersections, false)
	var meetingMap = getMeetingMap(facetIntersections, toolDirected, workMesh)
	sortAlongIndexesMapByFacetIntersections(facetIntersections, meetingMap)
	var originalLoneArrowSet = getLoneArrowSet(facets)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(gUnionExclusion, facetIntersection, facetIntersections, meetingMap, strata, toolDirected, workMesh)
	}
	addIntersectionsToMesh(facets, id, originalLoneArrowSet, workMesh)
	var facetIndexStart = facets.length
	addVerticalFacets(facetIntersections, false, toolPolygon, workMesh)
	if (!getIsEmpty(splitInsides)) {
		var toolFacets = facets.slice(facetIndexStart, facets.length)
		splitHeights = getSplitHeightsByInsides(toolFacets, splitHeights, splitInsides, workMesh)
	}
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	removeShortArrays(facets, 3)
}

var gAssembly = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'assembly',
	processStatement:function(registry, statement) {
		statement.tag = 'g'
		var meshes = []
		for (var child of statement.children) {
			var mesh = getWorkMeshByID(child.attributeMap.get('id'), registry)
			if (mesh != null) {
				meshes.push(mesh)
			}
		}
		if (getIsEmpty(meshes)) {
			noticeByList(['No meshes could be found for assembly in construction.', statement])
			return
		}
		var centerScale = getFloatsByStatement('centerScale', registry, statement)
		analyzeOutputMesh(getAssembledMesh(centerScale, meshes), registry, statement)
	}
}

var gDifference = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'difference',
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		if (getIsEmpty(polygons)) {
			noticeByList(['No tool polygons could be found for difference in construction.', statement])
			return
		}
		if (!statement.attributeMap.get('work')) {
			noticeByList(['No work could be found for difference in construction.', statement])
			return
		}
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			var matrix3D = getChainMatrix3D(registry, statement)
			var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
			var splitInsides = getFloatsByStatement('splitInsides', registry, statement)
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			differenceByPillar(statement.attributeMap.get('id'), matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var workPolygons = getWorkPolygons(registry, statement)
		if (workPolygons.length == 0) {
			noticeByList(['No work polygon could be found for difference in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var workPolygons = getDifferencePolygonsByPolygons(polygons, workPolygons)
		if (getIsEmpty(workPolygons)) {
			noticeByList(['No polygons remained after difference operation in construction.', polygons, workPolygon, statement])
			return
		}
		addPolygonsToGroup(workPolygons, registry, statement)
	}
}

var gEmboss = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'emboss',
	processStatement:function(registry, statement) {
		convertToGroupIfParent(statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var isTop = getBooleanByDefault(true, 'top', registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		var stratas = getStratas(registry, statement)
		var bottomTools = getMeshesByKey('bottomTools', registry, statement)
		var topTools = getMeshesByKey('topTools', registry, statement)
		var tools = getMeshesByChildren(statement.children, registry)
		pushArray(tools, getMeshesByKey('tools', registry, statement))
		if (isTop) {
			pushArray(topTools, tools)
		}
		else {
			pushArray(bottomTools, tools)
		}
		if (bottomTools.length == 0 && topTools.length == 0) {
			noticeByList(['No toolMeshes could be found for emboss in construction.', statement])
			return
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		embossMeshesByTransform2Ds(matrix2Ds, matrix3D, false, stratas, bottomTools, workMesh)
		embossMeshesByTransform2Ds(matrix2Ds, matrix3D, true, stratas, topTools, workMesh)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gIntersection = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'intersection',
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			if (getIsEmpty(polygons)) {
				noticeByList(['No tool polygons could be found for intersection in construction.', statement])
				return
			}
			var matrix3D = getChainMatrix3D(registry, statement)
			var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
			var splitInsides = getFloatsByStatement('splitInsides', registry, statement)
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			intersectionByPillar(statement.attributeMap.get('id'), matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for intersection in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var intersectedPolygons = getIntersectionPolygonsByPolygons(polygons)
		if (getIsEmpty(intersectedPolygons)) {
			noticeByList(['No polygons remained after intersection operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(intersectedPolygons, registry, statement)
	}
}

var gJoin = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'join',
	processStatement:function(registry, statement) {
		var workMeshes = getWorkMeshes(registry, statement)
		if (getIsEmpty(workMeshes)) {
			noticeByList(['No work meshes could be found for join in construction.', statement])
			return
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		var matrix3D = getChainMatrix3D(registry, statement)
		joinMeshes(matrix2Ds, matrix3D, workMeshes)
		analyzeOutputMesh(getMeshCopy(workMeshes[0]), registry, statement)
	}
}

var gOverlap = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'overlap',
	processStatement: function(registry, statement) {
		convertToGroup(statement)
		var polygons = getChainPointListsHDRecursivelyDelete(registry, statement, 'polygon')
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for overlap in construction.', statement])
			return
		}
		var outset = getPointByDefault([1.0, 1.0], 'outset', registry, statement, this.name)
		var overlappedPolygons = getOverlappedPolygons(outset, polygons)
		if (overlappedPolygons.length == 0) {
			noticeByList(['No polygons remained after overlap operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(overlappedPolygons, registry, statement)
	}
}

var gUnion = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)
	},
	name: 'union',
	processStatement:function(registry, statement) {
		convertToGroup(statement)
		var polygons = getPolygonsHDRecursively(registry, statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh != null) {
			if (getIsEmpty(polygons)) {
				noticeByList(['No tool polygons could be found for union in construction.', statement])
				return
			}
			var matrix3D = getChainMatrix3D(registry, statement)
			var splitHeights = getFloatsByStatement('splitHeights', registry, statement)
			var splitInsides = getFloatsByStatement('splitInsides', registry, statement)
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			unionByPillar(statement.attributeMap.get('id'), matrix2Ds, matrix3D, splitHeights, splitInsides, toolPillar, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for union in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var joinedPolygons = getUnionPolygonsByPolygons(polygons)
		if (joinedPolygons.length == 0) {
			noticeByList(['No polygons remained after union operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(joinedPolygons, registry, statement)
	}
}

var gConstructionProcessors = [gAssembly, gDifference, gEmboss, gIntersection, gJoin, gOverlap, gUnion]
