export class $(echo $feature | sed 's/-//' | sed 's/\(.\)/\U\1/' | head -c 1)$(echo $feature | sed 's/^.\|//;s/-\(.\)/\U\1/g')Feature {
  static init() {
    console.log('Feature initialized');
  }
}
