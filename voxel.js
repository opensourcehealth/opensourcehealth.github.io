//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

const gDirections = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const gXYPlanar = [1, 2, 0, 3]
const gYZPlanar = [3, 4, 2, 5]
const gZXPlanar = [5, 0, 4, 1]
const gPlanars = [gYZPlanar, gZXPlanar, gXYPlanar]

function addTestVoxels(voxelMap) {
	voxelMap.set('10,0,0', [null,null,null,null,null,null]);
//	return
	voxelMap.set('11,0,0', [null,null,null,[11.0, 0.3, 0.0],null,null]);
	voxelMap.set('12,0,0', [null,null,null,null,null,null]);
	voxelMap.set('13,0,0', [null,null,null,null,null,null]);
	voxelMap.set('13,1,0', [null,null,null,null,null,null]);
	voxelMap.set('13,2,0', [null,null,null,null,null,null]);
	voxelMap.set('13,3,0', [null,null,null,null,null,null]);
	voxelMap.set('12,3,0', [null,null,null,null,null,null]);
	voxelMap.set('11,3,0', [null,null,null,null,null,null]);
	voxelMap.set('10,3,0', [null,null,null,null,null,null]);
	voxelMap.set('10,2,0', [null,null,null,null,null,null]);
	voxelMap.set('10,1,0', [null,null,null,null,null,null]);
	voxelMap.set('11,1,0', [null,null,[11.0, 0.7, 0.0],null,null,null]);
	voxelMap.set('10,0,1', [null,null,null,null,null,null]);
	voxelMap.set('10,1,1', [null,null,null,null,null,null]);
}

function addVoxelLine(crossDimension, key, lines, voxelMap, planar, pointMap, root, rotationIndex, tipMap, tips) {
	var endTipRotationIndex = rotationIndex
	var endTipDirectionIndex = planar[endTipRotationIndex]
	var tipZero = tips[endTipDirectionIndex]
	if (tipZero == null) {
		return
	}
	var line = {
		beginKey:key + ',' + endTipDirectionIndex,
		beginDirectionIndex:planar[(rotationIndex + 1) % 4],
		crossDirectionIndex:crossDimension + crossDimension}
	var next = root.slice(0)
	pointMap.set(line.beginKey, tipZero)
	for (var endRotationIndex = rotationIndex + 5; endRotationIndex > rotationIndex + 1; endRotationIndex--) {
		var tipIndex = planar[endRotationIndex % 4]
		if (tips != null) {
			var tipNext = tips[tipIndex]
			if (tipNext != null) {
				line.endDirectionIndex = endTipDirectionIndex
				line.endKey = key + ',' + tipIndex
				line.endPoint = tipNext
				addLineToMap(line, lines, tipMap, tipZero)
				lines.push(line)
				reversedLine = {
					beginDirectionIndex:line.endDirectionIndex,
					beginKey:line.endKey,
					beginPoint:line.endPoint,
					crossDirectionIndex:line.crossDirectionIndex + 1,
					endDirectionIndex:line.beginDirectionIndex,
					endKey:line.beginKey}
				addLineToMap(reversedLine, lines, tipMap, reversedLine.beginPoint)
				return
			}
		}
		addXYZ(next, gDirections[tipIndex])
		key = next.join(',')
		if (voxelMap.has(key)) {
			tips = voxelMap.get(key)
		}
		else {
			tips = null
		}
		endTipRotationIndex = (endTipRotationIndex + 3) % 4
		endTipDirectionIndex = planar[endTipRotationIndex]
	}
}

function addVoxelLines(crossDimension, voxelMap, lines, pointMap, tipMap) {
	for (entry of voxelMap) {
		key = entry[0]
		parameters = key.split(',')
		planar = gPlanars[crossDimension]
		root = [parseInt(parameters[0]), parseInt(parameters[1]), parseInt(parameters[2])]
		tips = entry[1]
		for (rotationIndex = 0; rotationIndex < 4; rotationIndex++) {
			addVoxelLine(crossDimension, key, lines, voxelMap, planar, pointMap, root, rotationIndex, tipMap, tips)
		}
	}
}

function addVoxelRow(directionIndex, entry, signedIntersectionsMap, voxelMap) {
	var direction = gDirections[directionIndex]
	var key = entry[0]
	var signedIntersections = entry[1]
	var yzParameters = key.split(',');
	var y = parseInt(yzParameters[0])
	var yBeside = y + direction[1]
	var z = parseInt(yzParameters[1])
	var zBeside = z + direction[2]
	var keyBeside = yBeside + ',' + zBeside
	if (signedIntersectionsMap.has(keyBeside)) {
		var signedIntersectionsAbove = signedIntersectionsMap.get(keyBeside)
		var signedIntersectionsInverted = []
		for (signedIntersection of signedIntersectionsAbove) {
			signedIntersectionsInverted.push([signedIntersection[0], -signedIntersection[1]])
		}
		signedIntersections = signedIntersections.concat(signedIntersectionsInverted)
	}
	signedIntersections.sort(compareSignedIntersectionAscending)
	var existence = 0
	var voxelStart = null
	for (signedIntersectionIndex = 0; signedIntersectionIndex < signedIntersections.length; signedIntersectionIndex++) {
		var signedIntersection = signedIntersections[signedIntersectionIndex]
		var existenceChange = signedIntersection[1]
		if (existenceChange < 0) {
			if (existence > 0) {
				for (voxelIndex = voxelStart; voxelIndex < signedIntersection[0]; voxelIndex++) {
					var voxelKey = voxelIndex + ',' + key
					if (!voxelMap.has(voxelKey)) {
						voxelMap.set(voxelKey, [null,null,null,null,null,null])
					}
					var root = [voxelIndex, y, z]
					voxelMap.get(voxelKey)[directionIndex] = root
				}
			}
		}
		else {
			voxelStart = signedIntersection[0]
		}
		existence += existenceChange
	}
}

function addVoxels(signedIntersectionsMap, voxelMap) {
	for (entry of signedIntersectionsMap) {
		addVoxelRow(2, entry, signedIntersectionsMap, voxelMap)
		addVoxelRow(3, entry, signedIntersectionsMap, voxelMap)
	}
	for (entry of signedIntersectionsMap) {
		addVoxelRow(4, entry, signedIntersectionsMap, voxelMap)
		addVoxelRow(5, entry, signedIntersectionsMap, voxelMap)
	}
}

function createPolygon(polygonSet, tipMap) {
	for (tip of tipMap.values()) {
		for (line of tip.lines) {
			originalBeginKey = line.beginKey
			polygon = [originalBeginKey]
			for (tipIndex = 0; tipIndex < 10; tipIndex++) {
				crossDirectionIndex = line.crossDirectionIndex
				tipLines = tipMap.get(line.endKey).lines
				for (tipLineIndex = 0; tipLineIndex < 4; tipLineIndex++) {
					if (tipLines[tipLineIndex].beginDirectionIndex == crossDirectionIndex) {
						line = tipLines[tipLineIndex]
						break
					}
				}
				if (line.beginKey == originalBeginKey) {
					break
				}
				else {
					polygon.push(line.beginKey)
				}
			}
			polygon = getPolygonRotatedToBottom(polygon)
			polygonKeyString = polygon.join(' ')
			if (!polygonSet.has(polygonKeyString)) {
				polygonSet.add(polygonKeyString)
			}
		}
	}
}

function createTips(voxelMap) {
	for (entry of voxelMap) {
		parameters = entry[0].split(',');
		root = [parseInt(parameters[0]), parseInt(parameters[1]), parseInt(parameters[2])];
		distance = [0.3, 0.3, 0.3];
		exterior = entry[1]
		for (rotationIndex = 0; rotationIndex < 6; rotationIndex++) {
			direction = gDirections[rotationIndex]
			if (!voxelMap.has(getXYZAddition(root, direction).join(','))) {
				exterior[rotationIndex] = getXYZAddition(root, getXYZMultiplication(distance, direction))
			}
		}
	}
}

function createTipsByIntersectionPairsMap(intersectionPairsMap, plane, voxelMap, z) {
	var plane0 = plane[0]
	var plane1 = plane[1]
	var plane2 = 3 - plane0 - plane1
	var direction0 = plane0 + plane0
	var direction1 = direction0 + 1
	for (y of intersectionPairsMap.keys()) {
		intersectionPairs = intersectionPairsMap.get(y)
		for (intersectionPair of intersectionPairs) {
			key = [null, null, null]
			key[plane0] = intersectionPair.beginIndex
			key[plane1] = y
			key[plane2] = z
			position = [null, null, null]
			position[plane0] = intersectionPair.beginIntersection
			position[plane1] = y
			position[plane2] = z
			getVoxel(key.join(','), voxelMap)[direction0] = position
			key[plane0] = intersectionPair.endIndex
			position = position.slice(0)
			position[plane0] = intersectionPair.endIntersection
			getVoxel(key.join(','), voxelMap)[direction1] = position
		}
	}
}
/*

function addPolygonKeyStringToCoplanar(coplanarMap, coplanars, lineMap, polygonKeyString) {
	coplanars.push(polygonKeyString)
	if (!coplanarMap.has(polygonKeyString)) {
		coplanarMap.set(polygonKeyString, coplanars)
	}
	polygonSet.delete(polygonKeyString)
	lineKeys = getLineKeys(polygonKeyString)
	for (lineKey of lineKeys) {
		line = lineMap.get(lineKey)
		line.checkedIndex += 1
	}
}

function getLineKeys(polygonKeyString) {
	polygon = polygonKeyString.split(' ')
	lineKeys = []
	for (keyIndex = 0; keyIndex < polygon.length; keyIndex++) {
		key0 = polygon[keyIndex]
		key1 = polygon[(keyIndex + 1) % polygon.length]
		if (key0 > key1) {
			key0 = key1
			key1 = polygon[keyIndex]
		}
		lineKeys.push(key0 + ' ' + key1)
	}
	return lineKeys
}
*/

function getVoxel(key, voxelMap) {
	if (voxelMap.has(key)) {
		return voxelMap.get(key)
	}
	exterior = [null,null,null,null,null,null]
	voxelMap.set(key, exterior)
	return exterior
}

function getVoxelsByXYZLattice(xyzLattice) {
	var voxelMap = new Map()
	for (entry of xyzLattice[0]) {
		createTipsByIntersectionPairsMap(entry[1], [0, 1], voxelMap, entry[0])
	}
	addVoxels(getSignedIntersectionsMapBySpacelMap(voxelMap), voxelMap)
	for (entry of xyzLattice[1]) {
		positionVoxelsByIntersectionPairsMap(entry[1], [1, 0], voxelMap, entry[0])
	}
	if (xyzLattice.length == 2) {
		return voxelMap
	}
	for (entry of xyzLattice[2]) {
		positionVoxelsByIntersectionPairsMap(entry[1], [2, 0], voxelMap, entry[0])
	}
	return voxelMap
}
/*
function getVoxelsByXYPolygonsMap(xyPolygonsMap) {
	var voxelMap = new Map()
	var xyzLattice = getXYZLattice(xyPolygonsMap)
	return getVoxelsByXYZLattice(xyzLattice)
}

function getXYZLattice(xyPolygonsMap) {
	var xyzLattice = new Array(2)
	xyzLattice[0] = new Map()
	for (entry of xyPolygonsMap) {
		xyzLattice[0].set(entry[0], getIntersectionPairsMap(entry[1]))
	}
	xyzLattice[1] = new Map()
	for (entry of xyPolygonsMap) {
		var xyPolygons = entry[1]
		swapXY(xyPolygons)
		xyzLattice[1].set(entry[0], getIntersectionPairsMap(xyPolygons))
	}
	return xyzLattice
}
*/
function getXYZLatticeByMesh(mesh) {
	xyPolygonsMap = getXYPolygonsMapByMesh(mesh)
	var xyzLattice = new Array(3)
	xyzLattice[0] = new Map()
	for (entry of xyPolygonsMap) {
		xyzLattice[0].set(entry[0], getIntersectionPairsMap(entry[1]))
	}
	xyzLattice[1] = new Map()
	for (entry of xyPolygonsMap) {
		var xyPolygons = entry[1]
		swapXY(xyPolygons)
		xyzLattice[1].set(entry[0], getIntersectionPairsMap(xyPolygons))
	}
	rotateXYZParametersByPointList(2, mesh.points)
	var xyPolygonsMap = getXYPolygonsMapByMesh(mesh)
	xyzLattice[2] = new Map()
	for (entry of xyPolygonsMap) {
		xyzLattice[2].set(entry[0], getIntersectionPairsMap(entry[1]))
	}
	rotateXYZParametersByPointList(-2, mesh.points)
	return xyzLattice
}

function positionVoxelsByIntersectionPairsMap(intersectionPairsMap, plane, voxelMap, z) {
	var plane0 = plane[0]
	var plane1 = plane[1]
	var plane2 = 3 - plane0 - plane1
	var direction0 = plane0 + plane0
	var direction1 = direction0 + 1
	for (y of intersectionPairsMap.keys()) {
		var intersectionPairs = intersectionPairsMap.get(y)
		for (intersectionPair of intersectionPairs) {
			var key = new Array(3)
			key[plane0] = intersectionPair.beginIndex
			key[plane1] = y
			key[plane2] = z
			var position = new Array(3)
			position[plane0] = intersectionPair.beginIntersection
			position[plane1] = y
			position[plane2] = z
			setVoxelPosition(direction0, key, position, voxelMap)
			key[plane0] = intersectionPair.endIndex
			var position = position.slice(0)
			position[plane0] = intersectionPair.endIntersection
			setVoxelPosition(direction1, key, position, voxelMap)
		}
	}
}

function setVoxelPosition(direction, key, position, voxelMap) {
	var keyString = key.join(',')
	if (voxelMap.has(keyString)) {
		var voxel = voxelMap.get(keyString)
		if (voxel[direction] != null) {
			voxel[direction] = position
		}
	}
}
