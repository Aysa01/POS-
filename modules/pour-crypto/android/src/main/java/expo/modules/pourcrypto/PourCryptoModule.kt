package expo.modules.pourcrypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.NoSuchAlgorithmException
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

class PourCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PourCrypto")
    // Expo AsyncFunction runs outside the JS thread. PBKDF2 uses Android's
    // cryptographic provider rather than hundreds of thousands of JS HMACs.
    AsyncFunction("pbkdf2") { password: String, saltHex: String, iterations: Int ->
      require(password.isNotEmpty() && password.length <= 128) { "Invalid passphrase length" }
      require(iterations in 1..2_000_000) { "Invalid key derivation count" }
      require(saltHex.length in 8..128 && saltHex.length % 2 == 0 && saltHex.matches(Regex("[0-9a-f]+"))) { "Invalid salt" }
      val salt = ByteArray(saltHex.length / 2) { i -> saltHex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
      val spec = PBEKeySpec(password.toCharArray(), salt, iterations, 256)
      val output = try {
        try {
          SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        } catch (_: NoSuchAlgorithmException) {
          // Android 7 providers may lack the PBKDF2 SHA-256 factory. A single
          // 32-byte PBKDF2 block using its native HMAC provider is equivalent.
          legacyDerive(password, salt, iterations)
        }
      } finally { spec.clearPassword(); salt.fill(0) }
      try {
        output.joinToString("") { byte -> (byte.toInt() and 0xff).toString(16).padStart(2, '0') }
      } finally { output.fill(0) }
    }
  }

  private fun legacyDerive(password: String, salt: ByteArray, iterations: Int): ByteArray {
    val passwordBytes = password.toByteArray(Charsets.UTF_8)
    val mac = Mac.getInstance("HmacSHA256")
    try { mac.init(SecretKeySpec(passwordBytes, "HmacSHA256")) }
    finally { passwordBytes.fill(0) }
    var block = mac.doFinal(salt + byteArrayOf(0, 0, 0, 1))
    val output = block.clone()
    repeat(iterations - 1) {
      val next = mac.doFinal(block); block.fill(0); block = next
      for (i in output.indices) output[i] = (output[i].toInt() xor block[i].toInt()).toByte()
    }
    block.fill(0)
    return output
  }
}
