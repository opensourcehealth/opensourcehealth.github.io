//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

function addFacetToLoneArrowSet(beginIndex, facet, loneArrowSet) {
	if (facet == null) {
		return
	}
	var endIndex = 1 - beginIndex
	for (var vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
		var consecutiveStrings = [facet[vertexIndex].toString(), facet[(vertexIndex + 1) % facet.length].toString()]
		var reverseKey = consecutiveStrings[endIndex] + ' ' + consecutiveStrings[beginIndex]
		if (loneArrowSet.has(reverseKey)) {
			loneArrowSet.delete(reverseKey)
		}
		else {
			loneArrowSet.add(consecutiveStrings[beginIndex] + ' ' + consecutiveStrings[endIndex])
		}
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

function differenceByPillar(id, matrix, splitHeights, toolPillar, matrix2Ds, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				differenceByPolygon(id, splitHeights, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function differenceByPolygon(id, splitHeights, strata, toolPolygon, workMesh) {
	var toolDirected = getDirectedPolygon(false, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var missingArrowSet = getMissingArrowSet(facetIntersections)
	var originalFacetIntersections = facetIntersections.slice(0)
	var originalFacetLength = workMesh.facets.length
	directFacetIntersections(facetIntersections, true)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(true, facetIntersectionIndex, facetIntersections)
	}
	var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
	sortRemoveMeetingsByFacetIntersections(facetIntersections, meetings)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'd', strata, toolDirected, workMesh)
	}
	var workMap = getDifferenceWorkMap(originalFacetIntersections, workMesh.facets, missingArrowSet, originalFacetLength)
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	removeShortArrays(workMesh.facets, 3)
	var facetIndexStart = workMesh.facets.length
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
}

function embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh) {
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
		reverseArray(toolMeshFacets)
		toolDirected.reverse()
	}
	for (var strata of stratas) {
		var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
		var missingArrowSet = getMissingArrowSet(facetIntersections)
		var originalFacetIntersections = facetIntersections.slice(0)
		var originalFacetLength = workMesh.facets.length
		var maximumZ = -Number.MAX_VALUE
		var minimumZ = Number.MAX_VALUE
		for (var facetIntersection of facetIntersections) {
			if (facetIntersection.isClockwise != isTop && !facetIntersection.isVertical) {
				for (var point of toolDirected) {
					if (getIsPointInsidePolygonOrClose(point, facetIntersection.workPolygon)) {
						var z = getZByPointPolygon(point, facetIntersection.workPolygon)
						maximumZ = Math.max(maximumZ, z)
						minimumZ = Math.min(minimumZ, z)
					}
				}
			}
		}
		var closeFacetIntersections = []
		for (var facetIntersectionIndex = 0; facetIntersectionIndex < facetIntersections.length; facetIntersectionIndex++) {
			var facetIntersection = facetIntersections[facetIntersectionIndex]
			if (facetIntersection.isClockwise == isTop || facetIntersection.isVertical) {
				for (var point of facetIntersection.workPolygon) {
					if (point[2] > maximumZ || point[2] < minimumZ) {
						closeFacetIntersections.push(facetIntersection)
						facetIntersections[facetIntersectionIndex] = null
						break
					}
				}
			}
		}
		removeNulls(facetIntersections)
		var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
		sortRemoveMeetingsByFacetIntersections(facetIntersections, meetings)
		var arrowAlongMap = new Map()
		for (var facetIntersection of facetIntersections) {
			var alongIndexesMap = facetIntersection.alongIndexesMap
			for (var nodeKey of alongIndexesMap.keys()) {
				var nodeStrings = nodeKey.split(' ')
				if (nodeStrings[0] == 'w') {
					var facet = workMesh.facets[facetIntersection.facetIndex]
					var beginIndex = parseInt(nodeStrings[1])
					var endIndex = (beginIndex + 1) % facet.length
					arrowAlongMap.set(facet[endIndex].toString() + ' ' + facet[beginIndex].toString(), alongIndexesMap.get(nodeKey))
				}
			}
		}
		for (var facetIntersection of facetIntersections) {
			alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'd', strata, toolDirected, workMesh)
		}
		for (var closeFacetIntersection of closeFacetIntersections) {
			var facet = workMesh.facets[closeFacetIntersection.facetIndex]
			for (var vertexIndex = facet.length - 1; vertexIndex > -1; vertexIndex--) {
				var endVertexIndex = (vertexIndex + 1) % facet.length
				var arrowKey = facet[vertexIndex].toString() + ' ' + facet[endVertexIndex].toString()
				if (arrowAlongMap.has(arrowKey)) {
					var alongIndexes = arrowAlongMap.get(arrowKey)
					var segment = new Array(alongIndexes.length)
					for (var alongIndexIndex = 0; alongIndexIndex < alongIndexes.length; alongIndexIndex++) {
						segment[alongIndexIndex] = meetings[alongIndexes[alongIndexIndex][1]].pointIndex
					}
					segment.reverse()
					spliceArray(facet, endVertexIndex, segment)
				}
			}
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
		removeShortArrays(workMesh.facets, 3)
		var workMap = getDifferenceWorkMap(originalFacetIntersections, workMesh.facets, missingArrowSet, originalFacetLength)
		for (var toolFacetIndex = 0; toolFacetIndex < toolMeshFacets.length; toolFacetIndex++) {
			var toolFacet = toolMeshFacets[toolFacetIndex]
			if (toolFacetIndex != xyFacetIndex) {
				workMesh.facets.push(getFacetByWorkMap(toolFacet, workMap))
			}
		}
	}
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
				setArraysToArraysUntil(toolMesh.points, toolMeshPoints, 2)
				transform2DPoints(matrix2D, toolMesh.points)
				embossMesh(inversePoints, isTop, stratas, toolMesh, workMesh)
			}
			setArraysToArraysUntil(toolMesh.points, toolMeshPoints, 2)
		}
	}
	pushArray(originalPoints, get3DsBy3DMatrix(matrix3D, inversePoints.slice(originalPoints.length, inversePoints.length)))
	workMesh.points = originalPoints
	removeUnfacetedPoints(workMesh)
}

function getDifferenceWorkMap(facetIntersections, facets, loneArrowSet, originalFacetLength) {
	for (var facetIntersection of facetIntersections) {
		var facet = facets[facetIntersection.facetIndex]
		addFacetToLoneArrowSet(0, facet, loneArrowSet)
	}
	for (var facetIndex = originalFacetLength; facetIndex < facets.length; facetIndex++) {
		addFacetToLoneArrowSet(0, facets[facetIndex], loneArrowSet)
	}
	return getWorkMapByArrowSet(loneArrowSet)
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
	if (!statement.attributeMap.has(key)) {
		return []
	}
	var ids = statement.attributeMap.get(key).replace(/,/g, ' ').split(' ').filter(lengthCheck)
	var meshes = []
	for (var id of ids) {
		if (registry.idMap.has(id)) {
			addMeshesRecursively(0, meshes, registry, registry.idMap.get(id))
		}
	}
	return meshes
}

function getMissingArrowSet(facetIntersections) {
	var missingArrowSet = new Set()
	for (var facetIntersection of facetIntersections) {
		addFacetToLoneArrowSet(1, facetIntersection.facet, missingArrowSet)
	}
	return missingArrowSet
}

function getOverlappedPolygons(outset, polygons) {
	if (polygons.length < 2) {
		return polygons
	}
	var overlappedPolygons = [polygons[0]]
	var outsetPolygons = [getOutsetPolygon(outset, polygons[0])]
	for (var polygonIndex = 1; polygonIndex < polygons.length; polygonIndex++) {
		pushArray(overlappedPolygons, getSubtractedPolygons(outsetPolygons, [polygons[polygonIndex]]))
		outsetPolygons.push(getOutsetPolygon(outset, polygons[polygonIndex]))
	}
	return overlappedPolygons
}

function getStratas(registry, statement) {
	var stratas = getFloatListsByStatement('stratas', registry, statement)
	if (getIsEmpty(stratas)) {
		return [null]
	}
	return stratas
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

function sectionByPillar(id, matrix, splitHeights, toolPillar, matrix2Ds, workMesh) {
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix), originalPoints)
	workMesh.points = inversePoints
	var intersectionFacets = []
	var originalFacets = getArraysCopy(workMesh.facets)
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				sectionByPolygon(id, intersectionFacets, originalFacets, splitHeights, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.facets = intersectionFacets
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function sectionByPolygon(id, intersectionFacets, originalFacets, splitHeights, strata, toolPolygon, workMesh) {
	workMesh.facets = getArraysCopy(originalFacets)
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var originalFacetIntersections = facetIntersections.slice(0)
	var originalFacetLength = workMesh.facets.length
	directFacetIntersections(facetIntersections, true)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(true, facetIntersectionIndex, facetIntersections)
	}
	var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
	sortRemoveMeetingsByFacetIntersections(facetIntersections, meetings)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'i', strata, toolDirected, workMesh)
	}
	var facetIndexSet = new Set()
	for (var facetIntersection of facetIntersections) {
		facetIndexSet.add(facetIntersection.facetIndex)
	}
	for (var facetIndex = 0; facetIndex < workMesh.facets.length; facetIndex++) {
		if (!facetIndexSet.has(facetIndex)) {
			workMesh.facets[facetIndex] = null
		}
	}
	var workMap = getDifferenceWorkMap(originalFacetIntersections, workMesh.facets, new Set(), originalFacetLength)
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	removeShortArrays(workMesh.facets, 3)
	var facetIndexStart = workMesh.facets.length
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
	for (var facet of workMesh.facets) {
		if (getIsLong(facet, 3)) {
			intersectionFacets.push(facet)
		}
	}
}

function weldByPillar(id, matrix, splitHeights, toolPillar, matrix2Ds, workMesh) {
	if (getIsEmpty(toolPillar.polygons)) {
		return
	}
	var originalPoints = workMesh.points
	var inversePoints = get3DsBy3DMatrix(getInverseRotation3D(matrix), originalPoints)
	workMesh.points = inversePoints
	for (var toolPolygon of toolPillar.polygons) {
		var transformedPolygons = getTransformed2DPointsByMatrix3Ds(toolPolygon, matrix2Ds)
		for (var strata of toolPillar.stratas) {
			for (var transformedPolygon of transformedPolygons) {
				weldByPolygon(id, splitHeights, strata, transformedPolygon, workMesh)
			}
		}
	}
	workMesh.points = originalPoints
	pushArray(workMesh.points, get3DsBy3DMatrix(matrix, inversePoints.slice(originalPoints.length, inversePoints.length)))
	removeUnfacetedPoints(workMesh)
}

function weldByPolygon(id, splitHeights, strata, toolPolygon, workMesh) {
	var toolDirected = getDirectedPolygon(true, toolPolygon)
	var facetIntersections = getFacetIntersections(strata, toolDirected, workMesh)
	var missingArrowSet = getMissingArrowSet(facetIntersections)
	var originalFacetIntersections = facetIntersections.slice(0)
	var originalFacetLength = workMesh.facets.length
	directFacetIntersections(facetIntersections, false)
	for (var facetIntersectionIndex = facetIntersections.length - 1;  facetIntersectionIndex > -1; facetIntersectionIndex--) {
		removeUnpairedFacet(false, facetIntersectionIndex, facetIntersections)
	}
	var meetings = getMeetings(facetIntersections, toolDirected, workMesh)
	sortRemoveMeetingsByFacetIntersections(facetIntersections, meetings)
	for (var facetIntersection of facetIntersections) {
		alterFacetsAddHorizontals(facetIntersection, facetIntersections, meetings, 'd', strata, toolDirected, workMesh)
	}
	var workMap = getDifferenceWorkMap(originalFacetIntersections, workMesh.facets, missingArrowSet, originalFacetLength)
	var toolMap = getToolMap(facetIntersections, workMesh.points, toolDirected)
	var facetIndexStart = workMesh.facets.length
	addFacetsByToolWorkMaps(workMesh.facets, toolMap, workMap)
	addSplitIndexesByIndexStart(facetIndexStart, id, splitHeights, workMesh)
}

var gDifference = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)

		//deprecated23
		gTagCenterMap.set('drill', this)

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
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			differenceByPillar(statement.attributeMap.get('id'), matrix3D, splitHeights, toolPillar, matrix2Ds, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		var workPolygons = getWorkPolygons(registry, statement)
		if (workPolygons.length == 0) {
			noticeByList(['No work polygon could be found for difference in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var workPolygons = getSubtractedPolygons(polygons, workPolygons)
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
		convertToGroup(statement)
		var workMesh = getWorkMesh(registry, statement)
		if (workMesh == null) {
			return
		}
		var isTop = getBooleanByDefault(true, 'top', registry, statement, this.name)
		var matrix3D = getChainMatrix3D(registry, statement)
		var stratas = getStratas(registry, statement)
		var bottomMeshes = getMeshesByKey('bottomTools', registry, statement)
		var topMeshes = getMeshesByKey('topTools', registry, statement)
		var toolMeshes = getMeshesByChildren(statement.children, registry)
		if (isTop) {
			pushArray(topMeshes, toolMeshes)
		}
		else {
			pushArray(bottomMeshes, toolMeshes)
		}
		var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
		embossMeshesByTransform2Ds(matrix2Ds, matrix3D, false, stratas, bottomMeshes, workMesh)
		embossMeshesByTransform2Ds(matrix2Ds, matrix3D, true, stratas, topMeshes, workMesh)
		analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
	}
}

var gIntersection = {
	initialize: function() {
		gTagCenterMap.set(this.name, this)

		//deprecated23
		gTagCenterMap.set('section', this)

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
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			sectionByPillar(statement.attributeMap.get('id'), matrix3D, splitHeights, toolPillar, matrix2Ds, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for intersection in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var intersectedPolygons = getIntersectedPolygons(polygons)
		if (getIsEmpty(intersectedPolygons)) {
			noticeByList(['No polygons remained after intersection operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(intersectedPolygons, registry, statement)
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

		//deprecated23
		gTagCenterMap.set('weld', this)

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
			var stratas = getStratas(registry, statement)
			var toolPillar = {polygons:polygons, stratas:stratas}
			var matrix2Ds = getMatrix2DsByChildren(statement.children, registry)
			weldByPillar(statement.attributeMap.get('id'), matrix3D, splitHeights, toolPillar, matrix2Ds, workMesh)
			analyzeOutputMesh(getMeshCopy(workMesh), registry, statement)
			return
		}
		pushArray(polygons, getWorkPolygons(registry, statement))
		if (polygons.length == 0) {
			noticeByList(['No work or tool polygon could be found for union in construction.', statement])
			return
		}
		deleteStatementsByTagDepth(0, registry, statement, 'polygon')
		var joinedPolygons = getJoinedPolygons(polygons)
		if (joinedPolygons.length == 0) {
			noticeByList(['No polygons remained after union operation in construction.', polygons, statement])
			return
		}
		addPolygonsToGroup(joinedPolygons, registry, statement)
	}
}

var gConstructionProcessors = [gDifference, gEmboss, gIntersection, gOverlap, gUnion]
