//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
//https://upload.wikimedia.org/wikipedia/commons/3/39/Periodic_table_large.png

var Science = {
airDensity: function(height = 0.0, pressure = 101300, temperature = 298.15, gravity = 9.8, molecularWeight = 28.97) {
	var seaLevelDensity = pressure * molecularWeight / 8314.46261815324 / temperature
	return seaLevelDensity / Math.exp(height / Science.airColumnHeight(temperature, gravity, molecularWeight))
},

airColumnHeight: function(temperature = 298.15, gravity = 9.8, molecularWeight = 28.97) {
	return temperature * 8314.46261815324 / molecularWeight / gravity
},

capacitanceCylinder: function(length = 1.0, radiusRatio = Math.E, dielectricConstant = 1.0) {
	return length * dielectricConstant * Science.permittivityFreeSpace * gPI2 / Math.log(radiusRatio)
},

capacitanceParallelPlate: function(area = 1.0, distance = 1.0, dielectricConstant = 1.0) {
	return area * dielectricConstant * Science.permittivityFreeSpace / distance
},

capacitanceSphere: function(radius = 1.0, dielectricConstant = 1.0) {
	return radius * dielectricConstant * Science.permittivityFreeSpace * 4.0 * Math.PI
},

capacitanceSphericalCapacitor: function(radiusInner = 1.0, radiusOuter = 2.0, dielectricConstant = 1.0) {
	return (radiusInner * radiusOuter) / (radiusOuter - radiusInner) * dielectricConstant * Science.permittivityFreeSpace * 4.0 * Math.PI
},

getAtomicMassMap: function() {
	if (Science.atomicMassMap != undefined) {
		return Science.atomicMassMap
	}

	var atomicMassSkips = ['H', 1.00794, 'He', 4.002602]

	Vector.pushArray(atomicMassSkips, ['Li', 6.941, 'Be', 9.012182])
	Vector.pushArray(atomicMassSkips, ['B', 10.811, 'C', 12.0107, 'N', 14.0067, 'O', 15.9994, 'F', 18.998403, 'Ne', 20.1797])

	Vector.pushArray(atomicMassSkips, ['Na', 22.98976, 'Mg', 24.305])
	Vector.pushArray(atomicMassSkips, ['Al', 26.98153, 'Si', 28.0855, 'P', 30.97696, 'S', 32.065, 'Cl', 35.453, 'Ar', 39.948])

	Vector.pushArray(atomicMassSkips, ['K', 39.0983, 'Ca', 40.078])
	Vector.pushArray(atomicMassSkips, ['Sc', 44.95591, 'Ti', 47.867, 'V', 50.9415, 'Cr', 51.9962, 'Mn', 54.93804])
	Vector.pushArray(atomicMassSkips, ['Fe', 55.845, 'Co', 58.93319, 'Ni', 58.6934, 'Cu', 63.546, 'Zn', 65.38])
	Vector.pushArray(atomicMassSkips, ['Ga', 69.723, 'Ge', 72.64, 'As', 74.9216, 'Se', 78.96, 'Br', 79.904, 'Kr', 83.798])

	Vector.pushArray(atomicMassSkips, ['Rb', 85.4678, 'Sr', 87.62])
	Vector.pushArray(atomicMassSkips, ['Y', 88.90585, 'Zr', 91.224, 'Nb', 92.90638, 'Mo', 95.96, 'Tc', 98])
	Vector.pushArray(atomicMassSkips, ['Ru', 101.07, 'Rh', 102.9055, 'Pd', 106.42, 'Ag', 107.8682, 'Cd', 112.441])
	Vector.pushArray(atomicMassSkips, ['In', 114.818, 'Sn', 118.71, 'Sb', 121.76, 'Te', 127.6, 'I', 126.9044, 'Xe', 131.293])

	Vector.pushArray(atomicMassSkips, ['Cs', 132.9054, 'Ba', 137.327])
	Vector.pushArray(atomicMassSkips, ['La', 138.9054, 'Ce', 140.116, 'Pr', 140.9076, 'Nd', 144.242, 'Pm', 145, 'Sm', 150.36, 'Eu', 151.964])
	Vector.pushArray(atomicMassSkips, ['Gb', 157.25, 'Td', 158.9253, 'Dy', 162.500, 'Ho', 164.9303, 'Er', 167.259, 'Tm', 168.9342, 'Yb', 173.054])
	Vector.pushArray(atomicMassSkips, ['Lu', 174.9668, 'Hf', 178.49, 'Ta', 180.9478, 'W', 183.84, 'Re', 186.207])
	Vector.pushArray(atomicMassSkips, ['Os', 190.23, 'Ir', 192.217, 'Pt', 195.084, 'Au', 196.9665, 'Hg', 200.59])
	Vector.pushArray(atomicMassSkips, ['Tl', 204.3833, 'Pb', 207.2, 'Bi', 208.9804, 'Po', 210, 'At', 210, 'Rn', 220])

	Vector.pushArray(atomicMassSkips, ['Fr', 223, 'Ra', 226])
	Vector.pushArray(atomicMassSkips, ['Ac', 227, 'Th', 232.0380, 'Pa', 231.0358, 'U', 238.0289, 'Np', 237, 'Pu', 244, 'Am', 243])
	Vector.pushArray(atomicMassSkips, ['Cm', 247, 'Bk', 247, 'Cf', 251, 'Es', 252, 'Fm', 257, 'Md', 258, 'No', 259])
	Vector.pushArray(atomicMassSkips, ['Lr', 262, 'Rf', 261, 'Db', 262, 'Sg', 266, 'Bh', 264])
	Vector.pushArray(atomicMassSkips, ['Hs', 277, 'Mt', 268, 'Ds', 271, 'Rg', 272, 'Cn', 285])
	Vector.pushArray(atomicMassSkips, ['Nh', 284, 'Fl', 289, 'Mc', 288, 'Lv', 292, 'Ts', 294, 'Og', 294])

//	Malate:C4H4O5	Orotate:C5H3N2O4	Threonate:C4H7O5
	Vector.pushArray(atomicMassSkips, ['Malate', 132.071, 'Orotate', 155.088, 'Threonate', 135.095])

	Science.atomicMassMap = MapKit.getMapBySkips(atomicMassSkips)
	return Science.atomicMassMap
},

getAtomicSetText: function(text) {
	var atomicSet = new Set()
	var conversions = []
	var elementCharacters = []
	var wasIntegerPlus = false
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		var character = text[characterIndex]
		if (gUpperCaseSet.has(character)) {
			var atomicName = character
			for (var nextIndex = characterIndex + 1; nextIndex < text.length; nextIndex++) {
				var nextCharacter = text[nextIndex]
				if (gLowerCaseSet.has(nextCharacter)) {
					atomicName += nextCharacter
				}
				else {
					break
				}
			}
			atomicSet.add(atomicName)
		}
		var isIntegerPlus = Science.integerDotSet.has(character)
		if (isIntegerPlus && !wasIntegerPlus) {
			conversions.push('*')
		}
		if (Science.upperBracketSet.has(character)) {
			conversions.push('+')
		}
		conversions.push(character)
		wasIntegerPlus = isIntegerPlus
	}

	return {atomicSet:SetKit.getSorted(atomicSet), conversionText:conversions.join('')}
},

getMassTableEntries: function(atomicSetText) {
	var atomicMassMap = Science.getAtomicMassMap()
	var entries = []
	var totalMass = 0.0
	for (var atomicName of atomicSetText.atomicSet) {
		var conversionText = atomicSetText.conversionText
		if (atomicMassMap.has(atomicName)) {
			for (var innerName of atomicSetText.atomicSet) {
				var replacement = 0
				if (atomicMassMap.has(innerName) && innerName == atomicName) {
					replacement = atomicMassMap.get(innerName)
				}
				conversionText = conversionText.replaceAll(innerName, replacement)
			}
			var mass = evaluator.getValueByEquation(undefined, undefined, conversionText)
			entries.push([atomicName, mass])
			totalMass += mass
		}
	}

	entries.push(['total', totalMass])
	return entries
},

integerDotSet: new Set('.0123456789'.split('')),

magneticIntensityLine: function(amperage = 1.0, distance = 1.0, numberOfConductors = 1.0) {
	return Science.permeabilityFreeSpace * amperage * numberOfConductors / 4.0 / Math.PI / distance
},

magneticIntensityLoop: function(amperage = 1.0, radius = 1.0, numberOfConductors = 1.0) {
	return Science.permeabilityFreeSpace * amperage * numberOfConductors / 2.0 / radius
},

mass: function(text) {
	var entries = Science.getMassTableEntries(Science.getAtomicSetText(text))
	return entries[entries.length - 1][1]
},

massProportion: function(text) {
	var atomicSetText = Science.getAtomicSetText(text)
	var entries = Science.getMassTableEntries(atomicSetText)
	var totalMass = entries[entries.length - 1][1]
	entries.pop()
	for (var entry of entries) {
		entry[1] /= totalMass
	}

	return Object.fromEntries(entries)
},

massTable: function(text) {
	return Object.fromEntries(Science.getMassTableEntries(Science.getAtomicSetText(text)))
},

modifyObject_Private: function() {
	Science.mass.optionMap = gMapS
	Science.massProportion.optionMap = gMapS
	Science.massTable.optionMap = gMapS
},

permeabilityFreeSpace: 4e-7 * Math.PI,

permittivityFreeSpace: 8.8541878176e-12,

rocketMassRatio: function(finalVelocity = 9000, exhaustVelocity = 3000) {
	return Math.exp(finalVelocity / exhaustVelocity)
},

tetherMassRatio: function(finalVelocity = 3000, tetherVelocity = 1000) {
	var velocityRatio = finalVelocity / tetherVelocity
	return Math.exp(velocityRatio * velocityRatio)
},

upperBracketSet: new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ('.split(''))
}
