//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gClose = 0.0000001

function addFacetBetweenPolygons(arrowIndexSetMap, facets, pointIndexes, pointIndexStart, points, polygon3D) {
	for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
		var bottomLeftIndex = pointIndexStart + vertexIndex
		var bottomRightIndex = pointIndexStart + (vertexIndex + 1) % polygon3D.length
		var topLeftIndex = bottomLeftIndex + polygon3D.length
		var topRightIndex = bottomRightIndex + polygon3D.length
		addToFacets(arrowIndexSetMap, facets, pointIndexes, points, [bottomLeftIndex, topLeftIndex, topRightIndex, bottomRightIndex])
	}
}

function addPolygon3DsToMesh(facets, isTriangular, points, polygon3Ds) {
	var arrowIndexSetMap = new Map()
	var polygon3DLast = polygon3Ds.length - 1
	var pointIndexStarts = new Array(polygon3Ds.length)
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3Ds.length; polygon3DIndex++) {
		pointIndexStarts[polygon3DIndex] = points.length
		pushArray(points, polygon3Ds[polygon3DIndex])
	}
	var pointIndexes = new Array(points.length)
	var pointStringIndexMap = new Map()
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		var point = points[pointIndex]
		var pointString = point[0].toString() + ',' + point[1].toString() + ',' + point[2].toString()
		if (pointStringIndexMap.has(pointString)) {
			pointIndexes[pointIndex] = pointStringIndexMap.get(pointString)
			points[pointIndex] = null
		}
		else {
			pointStringIndexMap.set(pointString, pointIndex)
			pointIndexes[pointIndex] = pointIndex
		}
	}
	facets.push(linkFacetVertexes(pointIndexes, getPolygonFacet(pointIndexStarts[0], polygon3Ds[0])))
	for (var polygon3DIndex = 0; polygon3DIndex < polygon3DLast; polygon3DIndex++) {
		addFacetBetweenPolygons(arrowIndexSetMap, facets, pointIndexes, pointIndexStarts[polygon3DIndex], points, polygon3Ds[polygon3DIndex])
	}
	facets.push(linkFacetVertexes(pointIndexes, getPolygonFacet(pointIndexStarts[polygon3DLast], polygon3Ds[polygon3DLast]).reverse()))
	for (var facet of facets) {
		var indexEntries = []
		for (var vertexIndexIndex = 0; vertexIndexIndex < facet.length; vertexIndexIndex++) {
			var vertexIndex = facet[vertexIndexIndex]
			var nextIndexIndex = (vertexIndexIndex + 1) % facet.length
			var nextIndex = facet[nextIndexIndex]
			var arrow = vertexIndex.toString() + ' ' + nextIndex.toString()
			if (arrowIndexSetMap.has(arrow)) {
				indexEntries.push([vertexIndexIndex, arrowIndexSetMap.get(arrow)])
			}
		}
		if (indexEntries.length > 0) {
			for (var entryIndex = indexEntries.length - 1; entryIndex > -1; entryIndex--) {
				var indexEntry = indexEntries[entryIndex]
				facet.splice(indexEntry[0] + 1, 0, indexEntry[1])
			}
		}
	}
	var pointLengths = new Array(points.length)
	var pointLength = 0
	for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
		pointLengths[pointIndex] = pointLength
		if (points[pointIndex] != null) {
			pointLength += 1
		}
		points[pointLengths[pointIndex]] = points[pointIndex]
	}
	points.length = pointLengths[points.length - 1] + 1
	for (var facet of facets) {
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			facet[vertexIndex] = pointLengths[facet[vertexIndex]]
		}
	}
	if (!isTriangular) {
		return
	}
	for (var facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		facets[facetIndex] = [facet[0], facet[1], facet[2]]
		for (vertexIndex = 2; vertexIndex < facet.length - 1; vertexIndex++) {
			facets.push([facet[0], facet[vertexIndex], facet[vertexIndex + 1]])
		}
	}
}

function addToArrowsMap(arrowsMap, edges) {
	var arrow = {beginKey:edges[0], endKey:edges[1]}
	addArrayElementToMap(arrow, arrow.beginKey, arrowsMap)
	arrow = {beginKey:arrow.endKey, endKey:arrow.beginKey}
	addArrayElementToMap(arrow, arrow.beginKey, arrowsMap)
}

function addToFacets(arrowIndexSetMap, facets, pointIndexes, points, polygonFacet) {
	linkFacetVertexes(pointIndexes, polygonFacet)
	var differentFacet = []
	const polygonFacetLengthMinus = polygonFacet.length - 1
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		var pointIndex = polygonFacet[vertexIndex]
		if (pointIndex != polygonFacet[(vertexIndex + polygonFacetLengthMinus) % polygonFacet.length]) {
			differentFacet.push(pointIndex)
		}
	}
	if (differentFacet.length < 3) {
		return
	}
	var concaveFacet = []
	const facetLengthMinus = differentFacet.length - 1
	const facetLengthPlus = differentFacet.length + 1
	for (var vertexIndex = 0; vertexIndex < differentFacet.length; vertexIndex++) {
		var previousPointIndex = differentFacet[(vertexIndex + facetLengthMinus) % differentFacet.length]
		var previousPoint = points[previousPointIndex]
		var pointIndex = differentFacet[vertexIndex]
		var point = points[pointIndex]
		var nextPointIndex = differentFacet[(vertexIndex + facetLengthPlus) % differentFacet.length]
		var nextPoint = points[nextPointIndex]
		var vectorA = getXYZSubtraction(previousPoint, point)
		var vectorB = getXYZSubtraction(nextPoint, point)
		var vectorALength = getXYZLength(vectorA)
		var vectorBLength = getXYZLength(vectorB)
		divideXYZByScalar(vectorA, vectorALength)
		divideXYZByScalar(vectorB, vectorBLength)
		if (getDotProduct(vectorA, vectorB) > 0.9999999) {
			if (vectorALength > vectorBLength) {
				arrowIndexSetMap.set(pointIndex.toString() + ' ' + previousPointIndex.toString(), nextPointIndex)
			}
			else {
				arrowIndexSetMap.set(nextPointIndex.toString() + ' ' + pointIndex.toString(), previousPointIndex)
			}
		}
		else {
			concaveFacet.push(pointIndex)
		}
	}
	if (concaveFacet.length > 2) {
		facets.push(concaveFacet)
	}
}

function addToPillarMesh(facets, isTriangular, points, polygon3D, zList) {
	var polygon3Ds = new Array(zList.length)
	for (var zIndex = 0; zIndex < zList.length; zIndex++) {
		var z = zList[zIndex]
		var polygon3DZ = new Array(polygon3D.length)
		for (var vertexIndex = 0; vertexIndex < polygon3D.length; vertexIndex++) {
			var vertex = polygon3D[vertexIndex]
			polygon3DZ[vertexIndex] = [vertex[0], vertex[1], vertex[2] + z]
		}
		polygon3Ds[zIndex] = polygon3DZ
	}
	addPolygon3DsToMesh(facets, isTriangular, points, polygon3Ds)
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

function getExtrusionMesh(isJoined, isTriangular, layers, transform3D) {
	if (layers.length == 0) {
		return null
	}
	if (layers[0].polygons.length == 0) {
		return null
	}
	polygon3DLists = []
	for (var polygonIndex = 0; polygonIndex < layers[0].polygons.length; polygonIndex++) {
		polygon3DLists.push([])
	}
	for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
		layer = layers[layerIndex]
		nextIndex = layerIndex + 1
		if (nextIndex < layers.length) {
			nextLayer = layers[nextIndex]
			if (layer.polygons.length != nextLayer.polygons.length) {
				return null
			}
			for (var polygonIndex = 0; polygonIndex < layer.polygons.length; polygonIndex++) {
				if (layer.polygons[polygonIndex].length != nextLayer.polygons[polygonIndex].length) {
					return null
				}
			}
		}
		for (var polygonIndex = 0; polygonIndex < layer.polygons.length; polygonIndex++) {
			var polygon3D = getPolygon3D(layer.polygons[polygonIndex])
			for (var vertex of polygon3D) {
				vertex[2] += layer.z
			}
			polygon3DLists[polygonIndex].push(polygon3D)
		}
	}
	var facets = []
	var points = []
	for (var polygon3Ds of polygon3DLists) {
		addPolygon3DsToMesh(facets, isTriangular, points, polygon3Ds)
//		for (var polygon3D of polygon3Ds) {
//			if (isJoined) {
//				for (var zIndex = 0; zIndex < zList.length; zIndex += 2) {
//					addPartToPillarMesh(facets, isTriangular, points, polygon3D, zList.slice(zIndex, zIndex + 2))
//				}
//			}
//			else {
//			addPolygon3DsToMesh(facets, isTriangular, points, polygon3Ds)
//				addToPillarMesh(facets, isTriangular, points, polygon3D, zList)
//			}
//		}
	}
	return {facets:facets, points:points}
}

function getIsFacetPointingOutside(facet, mesh) {
	var normal = getNormalByFacet(facet, mesh.points)
	if (normal == null || facet.length < 3) {
		return false
	}
	var rotatedPoints = getArraysCopy(mesh.points)
	var xyRotator = [normal[0], -normal[2]]
	for (rotatedPoint of rotatedPoints) {
		rotateXYZByBasis(gXZRotationBasis, rotatedPoint, xyRotator)
	}
	var normal = getNormalByFacet(facet, rotatedPoints)
	var xyRotator = [normal[0], -normal[1]]
	for (rotatedPoint of rotatedPoints) {
		rotateXYZByBasis(gXYRotationBasis, rotatedPoint, xyRotator)
	}
	var normal = getNormalByFacet(facet, rotatedPoints)
	var midpoint = null
	if (facet.length % 2 == 0) {
		midpoint = rotatedPoints[facet[facet.length / 2]]
	}
	else {
		var halfLengthMinusOne = (facet.length - 1) / 2
		midpoint = getXYZAddition(rotatedPoints[facet[halfLengthMinusOne]], rotatedPoints[facet[halfLengthMinusOne + 1]])
		multiplyXYZByScalar(midpoint, 0.5)
	}
	var rotatedMesh = {facets:mesh.facets, points:rotatedPoints}
	var xIntersections = getXIntersectionsByMesh(rotatedMesh, midpoint[1], midpoint[2])
	var numberOfIntersectionsToLeft = 0
	var midpointXPlus = midpoint[0] + gClose
	for (xIntersection of xIntersections) {
		if (xIntersection < midpointXPlus) {
			numberOfIntersectionsToLeft += 1
		}
	}
	return numberOfIntersectionsToLeft != 0 && numberOfIntersectionsToLeft % 2 == 0
}

function getJoinedCoplanarMesh(mesh) {
	var facets = mesh.facets
	var facetsMap = new Map()
	var linkMap = new Map()
	var normals = new Array(facets.length)
	var points = mesh.points
	for (facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		normals[facetIndex] = getNormalByFacet(facets[facetIndex], points)
	}
	for (facetIndex = 0; facetIndex < facets.length; facetIndex++) {
		var facet = facets[facetIndex]
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
			addArrayElementToMap(facetIndex, edgeKey, facetsMap)
		}
	}
	for (key of facetsMap.keys()) {
		var facetIndexes = facetsMap.get(key)
		if (facetIndexes.length == 2) {
			if (getXYZLengthSquared(getXYZSubtraction(normals[facetIndexes[0]], normals[facetIndexes[1]])) > 0.0001) {
				facetsMap.set(key, null)
			}
		}
		else {
			facetsMap.set(key, null)
		}
	}
	var facetIndexSet = new Set()
	for (facet of facets) {
		facetIndexSet.clear()
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
			var facetIndexes = facetsMap.get(edgeKey)
			if (facetIndexes != null) {
				addElementsToSet(facetIndexes, facetIndexSet)
			}
		}
		var greatestFacetIndex = -1
		for (facetIndex of facetIndexSet) {
			var linkFacetIndex = null
			if (linkMap.has(facetIndex)) {
				linkFacetIndex = linkMap.get(facetIndex)
			}
			if (linkFacetIndex == null) {
				linkFacetIndex = facetIndex
			}
			greatestFacetIndex = Math.max(greatestFacetIndex, linkFacetIndex)
		}
		for (facetIndex of facetIndexSet) {
			if (facetIndex != greatestFacetIndex) {
				linkMap.set(facetIndex, greatestFacetIndex)
			}
		}
	}
	var joinedMap = getJoinedMap(facets.length, linkMap)
	var joinedFacets = new Array(joinedMap.size)
	var joinedIndex = 0
	for (joined of joinedMap.values()) {
		var polygonKeyArrays = new Array(joined.length)
		for (var facetIndexIndex = 0; facetIndexIndex < joined.length; facetIndexIndex++) {
			polygonKeyArrays[facetIndexIndex] = facets[joined[facetIndexIndex]]
		}
		joinedFacets[joinedIndex] = getConnectedPolygon(getJoinedPolygonKeyArrays(polygonKeyArrays))
		joinedIndex++
	}
	return {facets:joinedFacets, points:points}
}

function getLargeFacet(mesh) {
	var largeFacet = null
	var greatestMinimumLengthSquared = -1
	var points = mesh.points
	for (facet of mesh.facets) {
		var minimumLengthSquared = Number.MAX_VALUE
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var lengthSquared = getXYZLengthSquared(getXYZSubtraction(points[vertexIndex], points[nextIndex]))
			minimumLengthSquared = Math.min(lengthSquared, minimumLengthSquared)
		}
		if (minimumLengthSquared > greatestMinimumLengthSquared) {
			greatestMinimumLengthSquared = minimumLengthSquared
			largeFacet = facet
		}
	}
	return largeFacet
}

function getMeshAnalysis(mesh) {
	if (mesh == null) {
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
	var unidirectionalEdges = []
	var numberOfUnidirectionalEdges = 0
	for (facetIndex = 0; facetIndex < mesh.facets.length; facetIndex++) {
		var facet = mesh.facets[facetIndex]
		if (facet.length > greatestFacetVertexes) {
			greatestFacetVertexes = facet.length
		}
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
			var arrow = facet[vertexIndex].toString() + ' ' + facet[nextIndex].toString()
			addArrayElementToMap(arrow, edgeKey, arrowsMap)
			addArrayElementToMap(facetIndex, edgeKey, facetsMap)
		}
	}
	var facetIndexSet = new Set()
	for (facet of mesh.facets) {
		facetIndexSet.clear()
		for (vertexIndex = 0; vertexIndex < facet.length; vertexIndex++) {
			var nextIndex = (vertexIndex + 1) % facet.length
			var edgeKey = getEdgeKey(facet[vertexIndex].toString(), facet[nextIndex].toString())
			addElementsToSet(facetsMap.get(edgeKey), facetIndexSet)
		}
		var greatestFacetIndex = -1
		for (facetIndex of facetIndexSet) {
			var linkFacetIndex = null
			if (linkMap.has(facetIndex)) {
				linkFacetIndex = linkMap.get(facetIndex)
			}
			if (linkFacetIndex == null) {
				linkFacetIndex = facetIndex
			}
			greatestFacetIndex = Math.max(greatestFacetIndex, linkFacetIndex)
		}
		for (facetIndex of facetIndexSet) {
			if (facetIndex != greatestFacetIndex) {
				linkMap.set(facetIndex, greatestFacetIndex)
			}
		}
	}
	for (arrows of arrowsMap.values()) {
		numberOfEdges += 1
		if (arrows.length == 1) {
			loneEdges.push(arrows[0])
		}
		else {
			if (arrows.length > 2) {
				moreThanDoubleEdges.push(arrows)
			}
			else {
				if (arrows[0] == arrows[1]) {
					unidirectionalEdges.push(arrows[0])
				}
			}
		}
	}
	var joinedMap = getJoinedMap(mesh.facets.length, linkMap)
	var largeFacet = getLargeFacet(mesh)
	var numberOfTooThinFacets = 0
	for (var facet of mesh.facets) {
		if (getNormalByFacet(facet, mesh.points) == null) {
			numberOfTooThinFacets += 1
		}
	}
	var isFacetPointingOutside = 'Meaningless because mesh is incorrect.'
	var numberOfIncorrectEdges = loneEdges.length + moreThanDoubleEdges.length + unidirectionalEdges.length
	if (numberOfIncorrectEdges == 0) {
		isFacetPointingOutside = getIsFacetPointingOutside(getLargeFacet(mesh), mesh)
	}
	var numberOfErrors = numberOfIncorrectEdges + numberOfTooThinFacets
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
	attributeMap.set('numberOfIncorrectEdges', numberOfIncorrectEdges.toString())
	attributeMap.set('numberOfShapes', joinedMap.size.toString())
	attributeMap.set('numberOfTooThinFacets', numberOfTooThinFacets.toString())
	if (moreThanDoubleEdges.length > 0) {
		attributeMap.set('moreThanDoubleEdges', moreThanDoubleEdges.join(';'))
	}
	if (unidirectionalEdges.length > 0) {
		attributeMap.set('unidirectionalEdges', unidirectionalEdges.join(';'))
	}
	return attributeMap
}

function getMeshBoundingBox(mesh) {
	var boundingBox = null
	var points = mesh.points
	for (facet of mesh.facets) {
		for (vertexIndex of facet) {
			var point = points[vertexIndex]
			if (boundingBox == null) {
				boundingBox = [point.slice(0), point.slice(0)]
			}
			else {
				widenBoundingBox(boundingBox, point)
			}
		}
	}
	return boundingBox
}

function getMeshByPolygonSet(pointMap, polygonSet) {
	var facets = new Array(polygonSet.size)
	var points = new Array(pointMap.size)
	var mesh = {facets:facets, points:points}
	var pointIndex = 0
	for (key of pointMap.keys()) {
		var point = pointMap.get(key)
		pointMap.set(key, pointIndex)
		points[pointIndex] = point
		pointIndex++
	}
	var facetIndex = 0
	for (polygonKeyString of polygonSet.keys()) {
		var polygonKeys = polygonKeyString.split(' ')
		var facet = new Array(polygonKeys.length)
		for (polygonKeyIndex = 0; polygonKeyIndex < polygonKeys.length; polygonKeyIndex++) {
			facet[polygonKeyIndex] = pointMap.get(polygonKeys[polygonKeyIndex])
		}
		facets[facetIndex] = facet
		facetIndex++
	}
	return mesh
}

function getNormalByFacet(facet, points) {
	if (facet.length < 3) {
		return null
	}
	var vectorA = getXYZSubtraction(points[facet[1]], points[facet[0]])
	var vectorB = getXYZSubtraction(points[facet[2]], points[facet[0]])
	var vectorALength = getXYZLength(vectorA)
	var vectorBLength = getXYZLength(vectorB)
	if (vectorALength == 0.0 || vectorBLength == 0.0) {
		return null
	}
	divideXYZByScalar(vectorA, vectorALength)
	divideXYZByScalar(vectorB, vectorBLength)
	if (Math.abs(getDotProduct(vectorA, vectorB)) > 0.9999999) {
		return null
	}
	return normalizeXYZ(getCrossProduct(vectorA, vectorB))
}

function getPillarMesh(isSeparate, isTriangular, polygons, transform3D, zList) {
	if (polygons.length == 0 || zList.length == 0) {
		return null
	}
	var facets = []
	var points = []
	for (polygon of polygons) {
		if (polygon.length > 0) {
			var polygon3D = getPolygon3D(polygon)
			if (isSeparate) {
				for (var zIndex = 0; zIndex < zList.length; zIndex += 2) {
					addToPillarMesh(facets, isTriangular, points, polygon3D, zList.slice(zIndex, zIndex + 2))
				}
			}
			else {
				addToPillarMesh(facets, isTriangular, points, polygon3D, zList)
			}
		}
	}
	return {facets:facets, points:points}
}

function getPointAlongEdge(edge, points, z) {
	var nodes = edge.split(' ')
	var begin = points[nodes[0]]
	if (nodes.length == 1) {
		return begin.slice(0, 2)
	}
	var end = points[nodes[1]]
	var endZ = end[2]
	return getXYByPortion((endZ - z) / (endZ - begin[2]), begin, end)
}

function getPolygon3D(polygon) {
	if (polygon[0].length > 2) {
		return polygon
	}
	var polygon3D = []
	for (vertex of polygon) {
		polygon3D.push([vertex[0], vertex[1], 0.0])
	}
	return polygon3D
}

function getPolygonFacet(pointIndexStart, polygon3D) {
	var polygonFacet = []
	for (var vertexIndex = pointIndexStart; vertexIndex < polygon3D.length + pointIndexStart; vertexIndex++) {
		polygonFacet.push(vertexIndex)
	}
	return polygonFacet
}

function getTriangleMeshString(filetype, id, mesh) {
	if (filetype.toLowerCase() != 'stl') {
		return null
	}
//solid your_name 
//facet normal
//  outer loop
//    vertex
//    vertex
//    vertex
//  endloop
//endfacet
//endsolid
	var meshStrings = ['solid ' + id]
	var points = mesh.points
	for (facet of mesh.facets) {
		var normal = getNormalByFacet(facet, points)
		var normalStrings = ['facet']
		if (normal != null) {
			normalStrings.push('normal')
			for (parameter of normal) {
				normalStrings.push(parameter.toFixed(2))
			}
		}
		meshStrings.push(normalStrings.join(' '))
		meshStrings.push('  outer loop')
		for (pointIndex of facet) {
			meshStrings.push('    vertex ' + points[pointIndex].toString().replace(/,/g, ' '))
		}
		meshStrings.push('  endloop')
		meshStrings.push('endfacet')
	}
	meshStrings.push('endsolid')
	return meshStrings.join('\n')
}

function getXIntersectionsByMesh(mesh, y, z) {
	var xIntersections = []
	var xyPolygons = getXYPolygonsByZ(mesh, z)
	for (xyPolygon of xyPolygons) {
		for (var vertexIndex = 0; vertexIndex < xyPolygon.length; vertexIndex++) {
			var vertex = xyPolygon[vertexIndex]
			var vertexNext = xyPolygon[(vertexIndex + 1) % xyPolygon.length]
			if ((vertex[1] < y) != (vertexNext[1] < y)) {
				deltaY = vertexNext[1] - vertex[1]
				beginPortion = (vertexNext[1] - y) / deltaY
				endPortion = 1.0 - beginPortion
				xIntersections.push(beginPortion * vertex[0] + endPortion * vertexNext[0])
			}
		}
	}
	return xIntersections
}

function getXYPolygonsByArrows(arrowsMap, points, z) {
	var xyPolygons = []
	for (arrows of arrowsMap.values()) {
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
						for (var nextArrowIndex = nextArrows.length - 1; nextArrowIndex > -1; nextArrowIndex--) {
							var nextArrow = nextArrows[nextArrowIndex]
							if (arrow.beginKey == nextArrow.endKey && arrow.endKey == nextArrow.beginKey) {
								nextArrows.splice(nextArrowIndex, 1)
							}
						}
						if (nextArrows.length == 0) {
							warningString = 'In getXYPolygonsByArrows, from the arrow.endKey:\n nextArrows.length == 0 in the arrowsMap:\n from the keys:\n'
							warning(warningString, [arrow, arrowsMap, keys])
							break
						}
						arrow = nextArrows[0]
						removeArrowFromMap(nextArrows, arrowsMap, arrow.beginKey)
						keys.push(arrow.beginKey)
					}
				}
				else {
					warningString = 'In getXYPolygonsByArrows, arrow.endKey:\n was not in the arrowsMap:\n from the keys:\n'
					warning(warningString, [arrow, arrowsMap, keys])
					break
				}
				if (keys[0] == arrow.endKey) {
					for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
						keys[keyIndex] = getPointAlongEdge(keys[keyIndex], points, z)
					}
					xyPolygons.push(keys)
					break
				}
				if (keys.length > 9876543) {
					warningString = 'In getXYPolygonsByArrows, polygon is too large or there is a mistake, length: \narrowKey: \nkeys: '
					warning(warningString, [keys.length, arrow, keys])
					break
				}
			}
			while (true)
		}
	}
	return xyPolygons
}

function getXYPolygonsByZ(mesh, z) {
	var facets = mesh.facets
	var arrowsMap = new Map()
	var points = mesh.points
	for (facet of facets) {
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
	for (facet of facets) {
		var zList = []
		var maximumZ = -Number.MAX_VALUE
		var minimumZ = Number.MAX_VALUE
		for (vertex of facet) {
			var z = points[vertex][2]
			zList.push(z)
			maximumZ = Math.max(maximumZ, z)
			minimumZ = Math.min(minimumZ, z)
		}
		maximumZ = Math.floor(maximumZ + 1.001)
		minimumZ = Math.ceil(minimumZ)
		for (var z = minimumZ; z < maximumZ; z++) {
			var edges = getEdgesByFacet(facet, z, zList)
//		console.log(z)
//		console.log(edges)
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
 	for (entry of xyPolygonsMap) {
		var z = entry[0]
		xyPolygonsMap.set(z, getXYPolygonsByArrows(entry[1], points, z))
	}
	return xyPolygonsMap
}

function linkFacetVertexes(pointIndexes, polygonFacet) {
	for (var vertexIndex = 0; vertexIndex < polygonFacet.length; vertexIndex++) {
		polygonFacet[vertexIndex] = pointIndexes[polygonFacet[vertexIndex]]
	}
	return polygonFacet
}

function removeArrowFromMap(arrows, arrowsMap, key) {
	if (arrows.length == 1) {
		arrowsMap.set(key, null)
	}
	else {
		arrows.shift()
	}
}
